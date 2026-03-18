import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, relative, dirname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { promises as fs } from 'fs'
import fsSync from 'fs'
import chokidar from 'chokidar'
import matter from 'gray-matter'
import AdmZip from 'adm-zip'
import ogs from 'open-graph-scraper'
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

  if (config.activeWorkspacePath && fsSync.existsSync(config.activeWorkspacePath)) {
    return config.activeWorkspacePath
  }

  // Fallback for legacy `notesDir` migration
  if (config.notesDir && fsSync.existsSync(config.notesDir)) {
    return config.notesDir
  }

  return join(app.getPath('documents'), 'Hypernote')
}

// Fetch list of normalized workspaces
const getWorkspaces = (userDataPath = app.getPath('userData')) => {
  const config = loadConfig(userDataPath)
  let workspaces = config.workspaces || []

  // Auto-migrate legacy `notesDir` into workspaces array if missing
  const defaultDir = join(app.getPath('documents'), 'Hypernote')
  const legacyDir = config.notesDir || defaultDir

  if (workspaces.length === 0) {
    workspaces = [{ name: 'Hypernote', path: legacyDir }]
    saveConfig(userDataPath, { workspaces, activeWorkspacePath: legacyDir })
  }

  // Ensure active workspace is set
  const activePath = config.activeWorkspacePath || legacyDir

  return { workspaces, activeWorkspacePath: activePath }
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

  // Custom Protocol for serving attachments
  protocol.handle('hypernote', (request) => {
    const url = request.url.replace('hypernote://', '')
    try {
      const decodedUrl = decodeURIComponent(url)
      const currentNotesDir = getNotesDir()
      const filePath = join(currentNotesDir, decodedUrl)
      return net.fetch(`file://${filePath}`)
    } catch (e) {
      console.error(e)
      return new Response('Failed', { status: 404 })
    }
  })

  ipcMain.handle('save-attachment', async (_, { currentNoteRelPath, fileBuffer }) => {
    const currentNotesDir = getNotesDir()
    const targetDir = dirname(join(currentNotesDir, currentNoteRelPath))

    if (!fsSync.existsSync(targetDir)) {
      await fs.mkdir(targetDir, { recursive: true })
    }

    // Generate random filename for the attachment to handle memory buffers easily
    let ext = 'png'
    if (fileBuffer.type === 'application/pdf') ext = 'pdf'
    else if (fileBuffer.name && fileBuffer.name.toLowerCase().endsWith('.3mf')) ext = '3mf'
    else if (fileBuffer.name && fileBuffer.name.toLowerCase().endsWith('.jpg')) ext = 'jpg'
    else if (
      fileBuffer.type === 'audio/mpeg' ||
      (fileBuffer.name && fileBuffer.name.toLowerCase().endsWith('.mp3'))
    )
      ext = 'mp3'
    else if (
      fileBuffer.type === 'audio/wav' ||
      (fileBuffer.name && fileBuffer.name.toLowerCase().endsWith('.wav'))
    )
      ext = 'wav'

    let base = fileBuffer.name || `attachment-${Date.now()}`
    if (base.toLowerCase().endsWith(`.${ext}`)) {
      base = base.substring(0, base.length - (ext.length + 1))
    }

    let targetFilename = `${base}.${ext}`
    let counter = 1
    while (fsSync.existsSync(join(targetDir, targetFilename))) {
      targetFilename = `${base}-${counter}.${ext}`
      counter++
    }

    const targetPath = join(targetDir, targetFilename)

    // fileBuffer.data is expected to be an ArrayBuffer sent via IPC in Electron 30+
    // or Buffer
    const buffer = Buffer.isBuffer(fileBuffer.data) ? fileBuffer.data : Buffer.from(fileBuffer.data)
    await fs.writeFile(targetPath, buffer)

    let thumbPath = undefined
    if (ext === '3mf') {
      try {
        const zip = new AdmZip(buffer)
        const entries = zip.getEntries()
        // Look for any png or jpg, usually they are in Metadata/ or thumbnail/
        // Avoid the 3D/ directory which might contain actual material textures
        let thumbEntry = entries.find((e) => {
          const name = e.entryName.toLowerCase()
          return (name.endsWith('.png') || name.endsWith('.jpg')) && !name.includes('3d/')
        })

        if (!thumbEntry) {
          console.log(
            `No thumbnail found in 3mf ${base}. Contained files:`,
            entries.map((e) => e.entryName)
          )
        }
        if (thumbEntry) {
          const thumbBuffer = thumbEntry.getData()
          const thumbExt = thumbEntry.entryName.toLowerCase().endsWith('.jpg') ? 'jpg' : 'png'
          const thumbFilename = `${targetFilename}-thumb.${thumbExt}`
          const fullThumbPath = join(targetDir, thumbFilename)
          await fs.writeFile(fullThumbPath, thumbBuffer)
          thumbPath = relative(currentNotesDir, fullThumbPath)
        }
      } catch (err) {
        console.error('Failed to extract 3mf thumbnail', err)
      }
    }

    return { path: relative(currentNotesDir, targetPath), thumbPath }
  })

  ipcMain.handle('open-path', async (_, url) => {
    try {
      const decodedUrl = decodeURIComponent(url.replace('hypernote://', ''))
      const currentNotesDir = getNotesDir()
      const filePath = join(currentNotesDir, decodedUrl)
      if (fsSync.existsSync(filePath)) {
        await shell.showItemInFolder(filePath)
      }
      return true
    } catch (e) {
      console.error('Failed to open path', e)
      return false
    }
  })

  ipcMain.handle('fetch-og', async (_, url) => {
    try {
      const options = { url }
      const { result } = await ogs(options)
      return result
    } catch (e) {
      console.error('Failed to fetch open graph data for url', url, e)
      return null
    }
  })

  ipcMain.handle('get-notes-dir', () => {
    return getNotesDir()
  })

  ipcMain.handle('get-workspaces', () => {
    return getWorkspaces()
  })

  ipcMain.handle('add-workspace', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
      title: 'Select Workspace Directory'
    })

    if (canceled || filePaths.length === 0) {
      return null
    }

    const newDir = filePaths[0]
    const { workspaces } = getWorkspaces()

    // Check if already exists
    if (!workspaces.find((w) => w.path === newDir)) {
      const name = newDir.split(/[/\\]/).pop() || 'New Workspace'
      workspaces.push({ name, path: newDir })
    }

    saveConfig(app.getPath('userData'), { workspaces, activeWorkspacePath: newDir })

    // Restart watcher
    if (win && win.setupWatcher) {
      win.setupWatcher()
    }

    // Tell UI to reload Notes
    win.reload()
    return newDir
  })

  ipcMain.handle('switch-workspace', async (event, path) => {
    saveConfig(app.getPath('userData'), { activeWorkspacePath: path })
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && win.setupWatcher) {
      win.setupWatcher()
      win.reload()
    }
    return true
  })

  ipcMain.handle('remove-workspace', async (event, pathToRemove) => {
    const { workspaces, activeWorkspacePath } = getWorkspaces()
    const newWorkspaces = workspaces.filter((w) => w.path !== pathToRemove)

    // If they delete all, give them a blank default back
    if (newWorkspaces.length === 0) {
      const defaultDir = join(app.getPath('documents'), 'Hypernote')
      newWorkspaces.push({ name: 'Hypernote', path: defaultDir })
    }

    let nextActive = activeWorkspacePath
    if (activeWorkspacePath === pathToRemove) {
      nextActive = newWorkspaces[0].path
    }

    saveConfig(app.getPath('userData'), {
      workspaces: newWorkspaces,
      activeWorkspacePath: nextActive
    })

    const win = BrowserWindow.fromWebContents(event.sender)
    if (activeWorkspacePath === pathToRemove && win && win.setupWatcher) {
      win.setupWatcher()
      win.reload() // Only reload if we actually switched active workspace
    }
    return { activeWorkspacePath: nextActive, workspaces: newWorkspaces }
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
