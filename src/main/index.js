import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, relative } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { promises as fs } from 'fs'
import fsSync from 'fs'
import chokidar from 'chokidar'
import matter from 'gray-matter'
import syncManager from './sync'

const CONFIG_FILE = 'app-config.json'

function loadConfig(userDataPath) {
  try {
    const configPath = join(userDataPath, CONFIG_FILE)
    if (fsSync.existsSync(configPath)) {
      const data = fsSync.readFileSync(configPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load config', e)
  }
  return {}
}

function saveConfig(userDataPath, newConfig) {
  try {
    const configPath = join(userDataPath, CONFIG_FILE)
    const current = loadConfig(userDataPath)
    const updated = { ...current, ...newConfig }
    fsSync.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save config', e)
  }
}

const getNotesDir = (userDataPath = app.getPath('userData')) => {
  const config = loadConfig(userDataPath)
  if (config.notesDir && fsSync.existsSync(config.notesDir)) {
    return config.notesDir
  }
  return join(app.getPath('documents'), 'Hypernote')
}

async function getNotes(dir) {
  // const relativePath = relative(getNotesDir(), dir)
  const entries = await fs.readdir(dir, { withFileTypes: true })

  const nodes = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name)
      const relPath = relative(getNotesDir(), fullPath)

      if (entry.isDirectory()) {
        return {
          title: entry.name,
          path: relPath,
          type: 'directory',
          children: await getNotes(fullPath)
        }
      } else if (entry.isFile() && /\.(md|txt|json|htm|html|rtf)$/i.test(entry.name)) {
        // Read frontmatter for caching/preview if needed,
        // but for now let's just return file info to keep it fast
        // or we can read it. Let's read it to provide titles/tags in the list.
        try {
          const content = await fs.readFile(fullPath, 'utf-8')
          const stats = await fs.stat(fullPath)
          const parsed = matter(content)

          // Parse wikilinks from body content
          const links = []
          const wikiLinkRegex = /\[\[(.*?)\]\]/g
          let match
          while ((match = wikiLinkRegex.exec(parsed.content)) !== null) {
            if (match[1]) {
              const linkTarget = match[1].split('|')[0].trim()
              if (linkTarget) {
                links.push(linkTarget)
              }
            }
          }

          return {
            title: parsed.data.title || entry.name.replace(/\.(md|txt|json|htm|html|rtf)$/i, ''),
            path: relPath,
            type: 'file',
            links,
            content: parsed.content, // Expose content for search
            ...parsed.data,
            // Fallback to file stats if metadata is missing
            dateCreated: parsed.data.dateCreated || stats.birthtime.toISOString(),
            dateEdited: parsed.data.dateEdited || stats.mtime.toISOString()
          }
        } catch (e) {
          console.error(`Failed to parse ${entry.name}`, e)
          return {
            title: entry.name,
            path: relPath,
            type: 'file',
            dateCreated: new Date().toISOString(), // Fallback
            dateEdited: new Date().toISOString()
          }
        }
      }
      return null
    })
  )

  return nodes.filter((n) => n !== null)
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    title: 'Hypernote',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Watcher
  let watcher = null

  const setupWatcher = () => {
    if (watcher) {
      watcher.close()
    }

    const notesDir = getNotesDir()
    if (!fsSync.existsSync(notesDir)) {
      fsSync.mkdirSync(notesDir, { recursive: true })
    }

    watcher = chokidar.watch(notesDir, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    })

    watcher.on('all', (event, path) => {
      try {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('note-update', { event, path })
        }
      } catch {
        // Ignore errors if window is destroyed/closed
      }
    })
  }

  setupWatcher()

  // Clean up watcher when window is closed (e.g. reload or quit)
  mainWindow.on('closed', () => {
    if (watcher) watcher.close()
  })

  // Listen for config changes to restart watcher
  // We can use a custom event or just expose a function/variable to main process
  // For now, let's keep it simple. If we change dir via IPC, we might need to trigger this.
  // Actually, we can move `setupWatcher` to outside `createWindow` scope if we pass mainWindow?
  // Or just recreate the window? No, that's heavy.
  // Let's attach `setupWatcher` to `mainWindow` or store it globally for this window.
  mainWindow.setupWatcher = setupWatcher

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize Sync
  syncManager.loadConfig(app.getPath('userData')).catch(console.error)

  // IPC Handlers
  // IPC Handlers
  
  ipcMain.handle('get-notes-dir', () => {
    return getNotesDir()
  })

  ipcMain.handle('select-notes-dir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
      title: 'Select Notes Directory'
    })

    if (canceled || filePaths.length === 0) {
      return null
    }

    const newDir = filePaths[0]
    saveConfig(app.getPath('userData'), { notesDir: newDir })

    // Restart watcher
    if (win && win.setupWatcher) {
      win.setupWatcher()
    }
    
    // Also reload window to refresh everything? 
    // Or just let UI reload notes.
    // UI usually calls `get-notes` on mount.
    // We should probably tell UI to refresh.
    // Reloading window is safest to ensure all paths are correct.
    win.reload()

    return newDir
  })

  // NOTE: getNotesDir() is dynamic, so we call it inside handlers


  ipcMain.handle('get-notes', async () => {
    const currentNotesDir = getNotesDir()
    if (!fsSync.existsSync(currentNotesDir)) {
      await fs.mkdir(currentNotesDir, { recursive: true })
    }
    return getNotes(currentNotesDir)
  })

  ipcMain.handle('read-note', async (_, relPath) => {
    const currentNotesDir = getNotesDir()
    const fullPath = join(currentNotesDir, relPath)
    const content = await fs.readFile(fullPath, 'utf-8')
    const parsed = matter(content)
    return {
      content: parsed.content,
      data: parsed.data,
      path: relPath
    }
  })

  ipcMain.handle('write-note', async (_, { relPath, content, data }) => {
    const currentNotesDir = getNotesDir()
    const fullPath = join(currentNotesDir, relPath)

    // Auto-update dateEdited while preserving other data
    const updatedData = {
      ...data,
      dateEdited: new Date().toISOString()
    }

    // Ensure dateCreated exists for robustness (e.g. legacy notes)
    if (!updatedData.dateCreated) {
      updatedData.dateCreated = updatedData.dateEdited
    }

    const str = matter.stringify(content, updatedData)
    await fs.writeFile(fullPath, str, 'utf-8')
    return true
  })

  ipcMain.handle('create-note', async (_, { relPath, content = '', data = {} }) => {
    const currentNotesDir = getNotesDir()
    const fullPath = join(currentNotesDir, relPath)
    // Ensure dir exists
    const dirname = join(fullPath, '..')
    await fs.mkdir(dirname, { recursive: true })

    // Initialize dateCreated and dateEdited for new notes
    const now = new Date().toISOString()
    const finalData = {
      dateCreated: now,
      dateEdited: now,
      title: data.title || relPath.split('/').pop().replace('.md', ''),
      ...data
    }

    const str = matter.stringify(content, finalData)
    await fs.writeFile(fullPath, str, 'utf-8')
    return true
  })

  ipcMain.handle('create-folder', async (_, relPath) => {
    const currentNotesDir = getNotesDir()
    const fullPath = join(currentNotesDir, relPath)
    await fs.mkdir(fullPath, { recursive: true })
    return true
  })

  ipcMain.handle('delete-note', async (_, relPath) => {
    const currentNotesDir = getNotesDir()
    const fullPath = join(currentNotesDir, relPath)
    const stats = await fs.stat(fullPath)

    if (stats.isDirectory()) {
      const files = await fs.readdir(fullPath)
      if (files.length > 0) {
        throw new Error('Folder is not empty. Please move or delete files first.')
      }
      await fs.rmdir(fullPath)
    } else {
      await fs.unlink(fullPath)
    }
    return true
  })

  ipcMain.handle('rename-note', async (_, oldRelPath, newRelPath) => {
    const currentNotesDir = getNotesDir()
    const oldPath = join(currentNotesDir, oldRelPath)
    const newPath = join(currentNotesDir, newRelPath)
    await fs.rename(oldPath, newPath)
    return true
  })

  ipcMain.handle('show-confirm-dialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showMessageBox(win, options)
    return result.response
  })

  ipcMain.handle('import-note', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Supported Files', extensions: ['md', 'txt', 'json', 'htm', 'html', 'rtf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (canceled || filePaths.length === 0) {
      return null
    }

    const sourcePath = filePaths[0]
    const content = await fs.readFile(sourcePath, 'utf-8')
    const filename = sourcePath.split('/').pop() || 'imported.txt'
    const ext = filename.split('.').pop()

    const currentNotesDir = getNotesDir()
    const importsDir = join(currentNotesDir, 'imports')
    if (!fsSync.existsSync(importsDir)) {
      await fs.mkdir(importsDir, { recursive: true })
    }

    // Ensure unique filename in imports folder
    let targetFilename = filename
    let counter = 1
    while (fsSync.existsSync(join(importsDir, targetFilename))) {
      const name = filename.replace(`.${ext}`, '')
      targetFilename = `${name} (${counter}).${ext}`
      counter++
    }

    const targetPath = join(importsDir, targetFilename)
    await fs.writeFile(targetPath, content, 'utf-8')

    return `imports/${targetFilename}`
  })

  // Sync Handlers
  ipcMain.handle('sync-auth-url', async (_, { clientId, clientSecret }) => {
    return syncManager.getAuthUrl(clientId, clientSecret)
  })

  ipcMain.handle('sync-exchange-code', async (_, code) => {
    return await syncManager.exchangeCode(code)
  })

  ipcMain.handle('sync-start-auto-auth', async (_, { clientId, clientSecret }) => {
    return await syncManager.startAuthFlow(clientId, clientSecret)
  })

  ipcMain.handle('sync-get-config', async () => {
    const config = await syncManager.loadConfig(app.getPath('userData'))
    return {
      clientId: config?.clientId,
      clientSecret: config?.clientSecret,
      hasTokens: !!config?.tokens
    }
  })

  ipcMain.handle('sync-start', async () => {
    try {
      const currentNotesDir = getNotesDir()
      const changes = await syncManager.sync(currentNotesDir)
      return { success: true, changes }
    } catch (e) {
      console.error('Sync failed', e)
      return { success: false, error: e.message }
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
