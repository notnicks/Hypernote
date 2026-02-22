import { useState, useEffect } from 'react'

export default function Settings({ theme }) {
  const [activeTab, setActiveTab] = useState('general')
  const [notesDir, setNotesDir] = useState('')

  const loadConfig = async () => {
    try {
      const dir = await window.api.getNotesDir()
      setNotesDir(dir)
    } catch (e) {
      console.error('Failed to load notes dir', e)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const handleSelectFolder = async () => {
    try {
      const newDir = await window.api.selectNotesDir()
      if (newDir) {
        setNotesDir(newDir)
      }
    } catch (e) {
      console.error('Failed to select folder', e)
    }
  }

  return (
    <div
      className={`p - 8 h - full overflow - y - auto ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} `}
    >
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`text - left px - 4 py - 2 rounded font - medium ${activeTab === 'general'
              ? theme === 'dark'
                ? 'bg-slate-800 text-blue-400'
                : 'bg-slate-200 text-blue-600'
              : 'opacity-70 hover:opacity-100'
              } `}
          >
            General
          </button>
          {/* 
          <button
            onClick={() => setActiveTab('sync')}
            className={`text - left px - 4 py - 2 rounded font - medium ${
  activeTab === 'sync'
    ? theme === 'dark'
      ? 'bg-slate-800 text-blue-400'
      : 'bg-slate-200 text-blue-600'
    : 'opacity-70 hover:opacity-100'
} `}
          >
            Sync (Legacy)
          </button>
          */}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === 'general' && (
            <div className="flex flex-col gap-8">
              <div
                className={`p - 6 rounded - lg border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'} `}
              >
                <h2 className="text-lg font-semibold mb-4 text-blue-500">
                  Storage Location
                </h2>

                <p className="mb-4 opacity-80 text-sm">
                  Select a local folder to store your notes. You can point this to a folder synced by Google Drive, Dropbox, or iCloud to sync across devices.
                </p>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase opacity-50">Current Folder</label>
                  <div className={`p - 3 rounded border font - mono text - sm break-all ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'} `}>
                    {notesDir || 'Loading...'}
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={handleSelectFolder}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 text-sm"
                  >
                    Change Folder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
