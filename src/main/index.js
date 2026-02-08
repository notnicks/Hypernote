import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, relative } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { promises as fs } from 'fs'
import fsSync from 'fs'
import chokidar from 'chokidar'
import matter from 'gray-matter'
import syncManager from './sync'

const getNotesDir = () => {
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
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
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
            title: parsed.data.title || entry.name.replace('.md', ''),
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
  const notesDir = getNotesDir()
  if (!fsSync.existsSync(notesDir)) {
    fsSync.mkdirSync(notesDir, { recursive: true })
  }

  const watcher = chokidar.watch(notesDir, {
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

  // Clean up watcher when window is closed (e.g. reload or quit)
  mainWindow.on('closed', () => {
    watcher.close()
  })

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
  const notesDir = getNotesDir()

  ipcMain.handle('get-notes', async () => {
    if (!fsSync.existsSync(notesDir)) {
      await fs.mkdir(notesDir, { recursive: true })
    }
    return getNotes(notesDir)
  })

  ipcMain.handle('read-note', async (_, relPath) => {
    const fullPath = join(notesDir, relPath)
    const content = await fs.readFile(fullPath, 'utf-8')
    const parsed = matter(content)
    return {
      content: parsed.content,
      data: parsed.data,
      path: relPath
    }
  })

  ipcMain.handle('write-note', async (_, { relPath, content, data }) => {
    const fullPath = join(notesDir, relPath)

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
    const fullPath = join(notesDir, relPath)
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
    const fullPath = join(notesDir, relPath)
    await fs.mkdir(fullPath, { recursive: true })
    return true
  })

  ipcMain.handle('delete-note', async (_, relPath) => {
    const fullPath = join(notesDir, relPath)
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
    const oldPath = join(notesDir, oldRelPath)
    const newPath = join(notesDir, newRelPath)
    await fs.rename(oldPath, newPath)
    return true
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
    // Don't expose tokens or secrets unnecessarily if not needed,
    // but the renderer needs client ID/Secret to generate auth url if we keep it stateless?
    // Actually syncManager stores them.
    // Let's return what we have so UI can populate fields.
    return {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      hasTokens: !!config.tokens
    }
  })

  ipcMain.handle('sync-start', async () => {
    try {
      const changes = await syncManager.sync(notesDir)
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
