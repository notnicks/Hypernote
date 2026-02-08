import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getNotes: () => ipcRenderer.invoke('get-notes'),
  readNote: (path) => ipcRenderer.invoke('read-note', path),
  writeNote: (path, content, data) =>
    ipcRenderer.invoke('write-note', { relPath: path, content, data }),
  createNote: (path, content, data) =>
    ipcRenderer.invoke('create-note', { relPath: path, content, data }),
  createFolder: (path) => ipcRenderer.invoke('create-folder', path),
  deleteNote: (path) => ipcRenderer.invoke('delete-note', path),
  renameNote: (oldPath, newPath) => ipcRenderer.invoke('rename-note', oldPath, newPath),
  onNoteUpdate: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on('note-update', subscription)
    return () => ipcRenderer.removeListener('note-update', subscription)
  },
  // Sync
  syncAuthUrl: (creds) => ipcRenderer.invoke('sync-auth-url', creds),
  syncStartAutoAuth: (creds) => ipcRenderer.invoke('sync-start-auto-auth', creds),
  syncExchangeCode: (code) => ipcRenderer.invoke('sync-exchange-code', code),
  syncGetConfig: () => ipcRenderer.invoke('sync-get-config'),
  syncStart: () => ipcRenderer.invoke('sync-start'),
  importNote: () => ipcRenderer.invoke('import-note'),
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
