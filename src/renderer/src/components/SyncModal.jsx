import { useState, useEffect } from 'react'
import { X, Cloud, RefreshCw, Key, ShieldCheck } from 'lucide-react'

export default function SyncModal({ isOpen, onClose, theme }) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [authCode, setAuthCode] = useState('')

  const [status, setStatus] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [hasTokens, setHasTokens] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const openConsole = () => {
    window.open('https://console.cloud.google.com/apis/credentials', '_blank')
  }

  useEffect(() => {
    if (isOpen) {
      loadConfig()
    }
  }, [isOpen])

  const loadConfig = async () => {
    try {
      const config = await window.api.syncGetConfig()
      if (config) {
        setClientId(config.clientId || '')
        setClientSecret(config.clientSecret || '')
        setHasTokens(config.hasTokens)
      }
    } catch (e) {
      console.error('Failed to load sync config', e)
    }
  }

  const handleAuthorize = async () => {
    if (!clientId || !clientSecret) {
      setStatus('Please provide Client ID and Secret.')
      return
    }
    try {
      const url = await window.api.syncAuthUrl({ clientId, clientSecret })
      await window.electron.ipcRenderer.send('open-external', url)
      // OR use window.open if context bridge allows, but generic way:
      // The main process usually blocks new windows.
      // Let's assume user copies it or we open it via shell in main if we added a handler?
      // Wait, main.js has:
      // mainWindow.webContents.setWindowOpenHandler((details) => { shell.openExternal(details.url); return { action: 'deny' } })
      // So window.open(url) should work and open in browser.
      window.open(url, '_blank')

      setNeedsAuth(true)
      setStatus('Please login in the browser and paste the code below.')
    } catch (e) {
      setStatus('Error generating auth URL: ' + e.message)
    }
  }

  const handleVerifyCode = async () => {
    if (!authCode) {
      setStatus('Please enter the authorization code.')
      return
    }
    try {
      await window.api.syncExchangeCode(authCode)
      setStatus('Authentication successful! Tokens saved.')
      setNeedsAuth(false)
      setHasTokens(true)
      setAuthCode('')
    } catch (e) {
      setStatus('Verification failed: ' + e.message)
    }
  }

  const handleSyncNow = async () => {
    if (!hasTokens) {
      setStatus('Please authenticate first.')
      return
    }
    setIsSyncing(true)
    setStatus('Syncing...')
    try {
      const result = await window.api.syncStart()
      if (result.success) {
        const uploads = result.changes.uploaded.length
        const downloads = result.changes.downloaded.length
        setStatus(`Sync complete. Uploaded: ${uploads}, Downloaded: ${downloads}`)
      } else {
        setStatus('Sync failed: ' + result.error)
      }
    } catch (e) {
      setStatus('Sync failed: ' + e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-[500px] rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`}
      >
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}
        >
          <h3 className="font-semibold flex items-center gap-2">
            <Cloud size={20} className="text-blue-500" />
            Google Drive Sync (BETA)
          </h3>
          <button onClick={onClose} className={`p-1 rounded hover:bg-black/10 transition`}>
            <X size={18} />
          </button>
        </div>

        {showHelp ? (
          <div className="p-6 flex flex-col gap-4 text-sm">
            <h4 className="font-bold text-lg">How to get credentials</h4>
            <ol className="list-decimal pl-5 space-y-2 opacity-90">
              <li>
                Go to{' '}
                <a href="#" onClick={openConsole} className="text-blue-500 hover:underline">
                  Google Cloud Console
                </a>
                .
              </li>
              <li>
                Create a new <strong>Project</strong>.
              </li>
              <li>
                Enable <strong>Google Drive API</strong> in &quot;APIs &amp; Services&quot;.
              </li>
              <li>
                Configure <strong>OAuth Consent Screen</strong> (External, User Type: Test). Add
                your email as a test user.
              </li>
              <li>
                Go to Credentials → Create Credentials → <strong>OAuth client ID</strong>.
              </li>
              <li>
                Select Application type: <strong>Desktop app</strong>.
              </li>
              <li>
                Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.
              </li>
            </ol>

            <button
              onClick={() => setShowHelp(false)}
              className={`mt-2 py-2 px-4 rounded font-medium self-start ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
            >
              Back to Setup
            </button>
          </div>
        ) : (
          <div className="p-6 flex flex-col gap-4">
            <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm border border-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-900/50 flex flex-col gap-2">
              <div>
                Authentication requires a <strong>Google Cloud Project</strong> with{' '}
                <strong>Drive API</strong> enabled.
              </div>
              <button
                onClick={() => setShowHelp(true)}
                className="text-left text-xs font-bold underline hover:no-underline self-start"
              >
                How to get credentials?
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="...apps.googleusercontent.com"
                className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Client Secret"
                className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            {!hasTokens && !needsAuth && (
              <button
                onClick={handleAuthorize}
                className={`w-full py-2 rounded font-medium flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
              >
                <Key size={16} />
                Authorize with Google
              </button>
            )}

            {needsAuth && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Paste authorization code here"
                    className={`flex-1 px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                  <button
                    onClick={handleVerifyCode}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                  >
                    Verify
                  </button>
                </div>
                <p className="text-xs opacity-50">
                  A browser window should have opened. Login and copy the code provided.
                </p>
              </div>
            )}

            {hasTokens && (
              <div className="flex items-center gap-2 text-green-500 text-sm font-medium p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-900/30">
                <ShieldCheck size={16} />
                Next sync is ready to go.
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200/10 mt-2">
              <span
                className={`text-sm ${status.includes('failed') || status.includes('Error') ? 'text-red-500' : 'text-blue-500'}`}
              >
                {status}
              </span>
            </div>
          </div>
        )}

        {!showHelp && (
          <div
            className={`px-4 py-3 border-t flex justify-end gap-2 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
          >
            <button
              onClick={handleSyncNow}
              disabled={isSyncing || !hasTokens}
              className={`px-4 py-2 rounded flex items-center gap-2 font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
