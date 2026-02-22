import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Dialog } from '@capacitor/dialog'

const ROOT_DIR = Directory.Documents
const BASE_PATH = 'Hypernote'

const getConnectPath = (path) => path ? `${BASE_PATH}/${path}` : BASE_PATH

// Helper to ensure base directory exists
const ensureBaseDir = async () => {
  try {
    await Filesystem.readdir({
      path: BASE_PATH,
      directory: ROOT_DIR
    })
  } catch (e) {
    await Filesystem.mkdir({
      path: BASE_PATH,
      directory: ROOT_DIR,
      recursive: true
    })
  }
}

// Helper to recursively read directory
const readDirRecursive = async (path = '') => {
  const fullPath = getConnectPath(path)
  try {
    const res = await Filesystem.readdir({
      path: fullPath,
      directory: ROOT_DIR
    })
    
    let items = []
    
    for (const file of res.files) {
      if (file.name.startsWith('.')) continue
      
      const itemPath = path ? `${path}/${file.name}` : file.name
      
      if (file.type === 'directory') {
        const children = await readDirRecursive(itemPath)
        items = [...items, ...children]
      } else if (file.name.endsWith('.md')) {
        items.push({
          name: file.name,
          path: itemPath, // Relative path for our app logic
          isDirectory: false
        })
      }
    }
    
    return items
  } catch (e) {
    console.error('Error reading dir', e)
    return []
  }
}

export const capacitorApi = {
  getNotes: async () => {
    await ensureBaseDir()
    const files = await readDirRecursive()
    // Map to expected format
    return files.map(f => ({
      ...f,
      content: '', // Load on demand or pre-load? Electron loads on demand usually
      title: f.name.replace('.md', '')
    }))
  },
  
  readNote: async (path) => {
    try {
      const res = await Filesystem.readFile({
        path: getConnectPath(path),
        directory: ROOT_DIR,
        encoding: Encoding.UTF8
      })
      return res.data
    } catch (e) {
      console.error('Error reading note', e)
      return ''
    }
  },
  
  writeNote: async (path, content) => {
    try {
      await Filesystem.writeFile({
        path: getConnectPath(path),
        directory: ROOT_DIR,
        data: content,
        encoding: Encoding.UTF8,
        recursive: true
      })
      return true
    } catch (e) {
      console.error('Error writing note', e)
      return false
    }
  },
  
  createNote: async (path, content) => {
    // path includes filename
    return capacitorApi.writeNote(path, content)
  },
  
  createFolder: async (path) => {
    try {
      await Filesystem.mkdir({
        path: getConnectPath(path),
        directory: ROOT_DIR,
        recursive: true
      })
      return true
    } catch (e) {
      console.error('Error creating folder', e)
      return false
    }
  },
  
  deleteNote: async (path) => {
    try {
      await Filesystem.deleteFile({
        path: getConnectPath(path),
        directory: ROOT_DIR
      })
      return true
    } catch (e) {
      console.error('Error deleting note', e)
      return false
    }
  },
  
  renameNote: async (oldPath, newPath) => {
    try {
      await Filesystem.rename({
        from: getConnectPath(oldPath),
        to: getConnectPath(newPath),
        directory: ROOT_DIR
      })
      return true
    } catch (e) {
      console.error('Error renaming note', e)
      return false
    }
  },
  
  onNoteUpdate: (callback) => {
    // Capacitor doesn't have file watchers easily.
    // We might need to rely on manual refresh or events within the app.
    return () => {}
  },
  
  // Stubs for sync (can implement later if needed)
  syncAuthUrl: async () => '',
  syncStartAutoAuth: async () => '',
  syncExchangeCode: async () => '',
  syncGetConfig: async () => ({}),
  syncStart: async () => {},
  
  importNote: async () => {
    // Mobile file picker?
    console.warn('Import not implemented for mobile yet')
  },
  
  showConfirmDialog: async ({ message, detail, buttons }) => {
    const { value } = await Dialog.confirm({
      title: 'Confirm',
      message: `${message}\n${detail}`,
      okButtonTitle: buttons[0], // Save
      cancelButtonTitle: buttons[2] // Cancel
      // Dialog plugin is limited, simpler than Electron
    })
    // Map response to index
    return value ? 0 : 2 // 0=OK(Save), 2=Cancel. Discard(1) is hard.
    // Better: use Capacitor Dialog.prompt or action sheet?
    // For now, simple confirm: True=Save, False=Cancel
  }
}
