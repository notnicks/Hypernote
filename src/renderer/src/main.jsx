import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { capacitorApi } from './api/capacitor-api'

// Inject Capacitor API if not in Electron
if (!window.electron) {
  window.api = capacitorApi
  window.electron = { ipcRenderer: { invoke: () => { } } } // Mock to prevent crashes
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
