import { useState, useEffect } from 'react'
import { Cloud, RefreshCw, ShieldCheck } from 'lucide-react'

export default function Settings({ theme }) {
  const [activeTab, setActiveTab] = useState('sync')
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: '',
    hasTokens: false
  })
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const conf = await window.api.syncGetConfig()
      if (conf) {
        setConfig({
          clientId: conf.clientId || '',
          clientSecret: conf.clientSecret || '',
          hasTokens: conf.hasTokens
        })
      }
    } catch (e) {
      console.error('Failed to load config', e)
    }
  }

  const handleConnectData = async () => {
    if (!config.clientId || !config.clientSecret) {
      setStatus('Please enter Client ID and Client Secret')
      return
    }

    setIsLoading(true)
    setStatus('Waiting for browser authentication...')

    try {
      // Start automated flow
      await window.api.syncStartAutoAuth({
        clientId: config.clientId,
        clientSecret: config.clientSecret
      })
      setStatus('Connected successfully!')
      setConfig((prev) => ({ ...prev, hasTokens: true }))
    } catch (e) {
      setStatus('Connection failed: ' + e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncNow = async () => {
    setIsSyncing(true)
    setStatus('Syncing...')
    try {
      const result = await window.api.syncStart()
      if (result.success) {
        const u = result.changes.uploaded.length
        const d = result.changes.downloaded.length
        setStatus(`Sync complete. ↑${u} ↓${d}`)
      } else {
        setStatus('Sync failed: ' + result.error)
      }
    } catch (e) {
      setStatus('Sync error: ' + e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div
      className={`p-8 h-full overflow-y-auto ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}
    >
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('sync')}
            className={`text-left px-4 py-2 rounded font-medium ${
              activeTab === 'sync'
                ? theme === 'dark'
                  ? 'bg-slate-800 text-blue-400'
                  : 'bg-slate-200 text-blue-600'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            Sync
          </button>
          <button
            className="text-left px-4 py-2 rounded font-medium opacity-50 cursor-not-allowed"
            title="Coming soon"
          >
            General
          </button>
          <button
            className="text-left px-4 py-2 rounded font-medium opacity-50 cursor-not-allowed"
            title="Coming soon"
          >
            Appearance
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === 'sync' && (
            <div className="flex flex-col gap-8">
              <div
                className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Cloud size={20} className="text-blue-500" />
                  Google Drive Sync
                </h2>

                <div className="flex flex-col gap-4">
                  {config.hasTokens ? (
                    <div className="flex items-center gap-3 text-green-500 bg-green-50 dark:bg-green-900/20 p-4 rounded border border-green-200 dark:border-green-900/30">
                      <ShieldCheck size={24} />
                      <div>
                        <div className="font-bold">Connected to Google Drive</div>
                        <div className="text-sm opacity-80">Sync is ready.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm opacity-70 mb-2">
                      Connect your Google Drive to sync notes across devices.
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold opacity-80">Client ID</label>
                    <input
                      type="text"
                      value={config.clientId}
                      onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                      placeholder="...apps.googleusercontent.com"
                      className={`px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark'
                          ? 'bg-slate-900 border-slate-700'
                          : 'bg-white border-slate-300'
                      }`}
                    />

                    <label className="text-sm font-bold opacity-80 mt-2">Client Secret</label>
                    <input
                      type="password"
                      value={config.clientSecret}
                      onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                      placeholder="Client Secret"
                      className={`px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark'
                          ? 'bg-slate-900 border-slate-700'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div className="flex gap-3 mt-4">
                    {!config.hasTokens ? (
                      <button
                        onClick={handleConnectData}
                        disabled={isLoading || !config.clientId || !config.clientSecret}
                        className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isLoading ? 'Connecting...' : 'Connect to Google Drive'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfig({ ...config, hasTokens: false })}
                        className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm font-medium"
                      >
                        Disconnect / Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {config.hasTokens && (
                <div
                  className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}
                >
                  <h3 className="font-semibold mb-4">Sync Status</h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSyncNow}
                      disabled={isSyncing}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded flex items-center gap-2 font-medium"
                    >
                      <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <span className="text-sm opacity-70">{status}</span>
                  </div>
                </div>
              )}

              {status && !isSyncing && !status.includes('Sync complete') && (
                <div
                  className={`p-4 rounded border text-sm ${
                    status.includes('failed') || status.includes('Error')
                      ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/30'
                      : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30'
                  }`}
                >
                  {status}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
