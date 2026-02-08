import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import GraphView from './components/GraphView'
import HelpModal from './components/HelpModal'
import SyncModal from './components/SyncModal'
import Settings from './components/Settings'
import { Network, Edit3, Sun, Moon, HelpCircle, UploadCloud, Settings as SettingsIcon } from 'lucide-react'

function App() {
  const [notes, setNotes] = useState([])
  const [activeNote, setActiveNote] = useState(null)
  const [view, setView] = useState('editor') // 'editor' | 'graph'

  const [filterTags, setFilterTags] = useState([])
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('theme') || 'light'
    }
    return 'light'
  })

  useEffect(() => {
    console.log('Theme changed to:', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    console.log('HTML Classes:', document.documentElement.className)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    console.log('Toggling theme. Current:', theme)
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const loadNotes = async () => {
    try {
      const data = await window.api.getNotes()
      setNotes(data)
    } catch (e) {
      console.error('Failed to load notes', e)
    }
  }

  useEffect(() => {
    loadNotes()
    const unsubscribe = window.api.onNoteUpdate(() => {
      loadNotes()
    })
    return unsubscribe
  }, [])

  // Recursive helper to find note by title
  const findNoteByTitle = (nodes, title) => {
    for (const node of nodes) {
      if (node.type === 'file' && node.title === title) {
        return node
      }
      if (node.type === 'directory' && node.children) {
        const found = findNoteByTitle(node.children, title)
        if (found) return found
      }
    }
    return null
  }

  const handleCreateNote = async () => {
    let baseTitle = 'New Note'
    let counter = 0
    let titleToUse = baseTitle

    // Loop until we find a title that doesn't exist
    while (true) {
      titleToUse = counter === 0 ? baseTitle : `${baseTitle} ${counter}`
      if (!findNoteByTitle(notes, titleToUse)) {
        break
      }
      counter++
    }

    const name = `Untitled-${Date.now()}.md`
    // Use the unique title we found
    await window.api.createNote(name, `# ${titleToUse}`, { title: titleToUse })
  }

  const handleSaveNote = async (path, content, metadata) => {
    let targetPath = path
    if (metadata.title) {
      const safeTitle = metadata.title.replace(/[/\\]:"*?<>|]/g, '').trim()
      if (safeTitle) {
        // Uniqueness check: ignore self
        const existing = findNoteByTitle(notes, safeTitle)
        if (existing && existing.path !== path) {
          alert(
            `A note named "${safeTitle}" already exists in another folder. Titles must be unique.`
          )
          return // Abort save if duplicate
        }

        const newFilename = `${safeTitle}.md`
        const dir = path.substring(0, path.lastIndexOf('/') + 1)
        const newPath = dir + newFilename

        if (newPath !== path) {
          try {
            await window.api.renameNote(path, newPath)
            targetPath = newPath
            if (activeNote && activeNote.path === path) {
              setActiveNote({ ...activeNote, path: newPath, title: metadata.title })
            }
          } catch (e) {
            console.error('Rename failed', e)
          }
        }
      }
    }
    await window.api.writeNote(targetPath, content, metadata)
  }

  const handleDeleteNote = async (path) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await window.api.deleteNote(path)
        if (activeNote && activeNote.path === path) {
          setActiveNote(null)
          setView('editor') // Reset to editor view blank state
        }
        // Notes list auto-updates via fs watcher
      } catch (e) {
        console.error('Failed to delete note', e)
        const msg = e.message.includes('not empty')
          ? 'Folder is not empty. Please move or delete files first.'
          : 'Failed to delete: ' + e.message
        alert(msg)
      }
    }
  }

  const handleCreateFolder = async (folderName) => {
    if (!folderName) return
    // console.log("Creating folder:", folderName)
    try {
      if (!window.api.createFolder) {
        alert('Error: createFolder API missing. Please restart the app.')
        return
      }
      await window.api.createFolder(folderName)
      await loadNotes()
    } catch (e) {
      console.error('Failed to create folder', e)
      alert('Failed to create folder: ' + e.message)
    }
  }

  const handleMoveNote = async (srcPath, destPath) => {
    if (srcPath === destPath) return
    try {
      await window.api.renameNote(srcPath, destPath)
      if (activeNote && activeNote.path === srcPath) {
        setActiveNote({ ...activeNote, path: destPath })
      }
    } catch (e) {
      console.error('Failed to move note', e)
    }
  }

  const handleRenameItem = async (oldPath, newName) => {
    try {
      await window.api.renameNote(oldPath, newName)
    } catch (e) {
      console.error('Rename failed', e)
    }
  }

  const handleLinkClick = async (targetTitle) => {
    const target = findNoteByTitle(notes, targetTitle)

    if (target) {
      setActiveNote(target)
    } else {
      if (confirm(`Note "${targetTitle}" not found. Create it?`)) {
        const name = targetTitle.trim() + '.md'
        await window.api.createNote(name, `# ${targetTitle}\n\n`, { title: targetTitle })
        await loadNotes()
        // We need to wait for reload or optimistically find it?
        // loadNotes is async, but state update might lag.
        // Let's rely on onNoteUpdate or just wait a bit.
        // For now, let user find it newly created.
        // Or try to set it active after a delay?
        setTimeout(() => {
          // This is hacky, but simpler for now.
          // Ideally we get the new note object back from createNote but our API returns boolean/void.
        }, 500)
      }
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900">
      <Sidebar
        theme={theme}
        notes={notes}
        activeNote={activeNote?.path}
        onSelect={(node) => {
          setActiveNote(node)
          setView('editor')
        }}
        onCreateNote={handleCreateNote}
        onCreateFolder={handleCreateFolder}
        onMoveNote={handleMoveNote}
        onRenameItem={handleRenameItem}
        onDeleteNote={handleDeleteNote}
        filterTags={filterTags}
        onFilterChange={setFilterTags}
      />

      <div
        className={`flex-1 flex flex-col h-full ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}
      >
        <div
          className={`h-12 border-b flex justify-end items-center px-4 gap-2 shrink-0 ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
            }`}
        >
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className={`p-1.5 rounded bg-transparent transition-colors mr-2 ${theme === 'dark'
              ? 'text-slate-400 hover:bg-slate-700'
              : 'text-slate-500 hover:bg-slate-100'
              }`}
            title="Sync Settings"
          >
            <UploadCloud size={18} />
          </button>
          <button
            onClick={() => setIsHelpOpen(true)}
            className={`p-1.5 rounded bg-transparent transition-colors mr-2 ${theme === 'dark'
              ? 'text-slate-400 hover:bg-slate-700'
              : 'text-slate-500 hover:bg-slate-100'
              }`}
            title="Markdown Help"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded bg-transparent transition-colors mr-2 ${theme === 'dark'
              ? 'text-slate-400 hover:bg-slate-700'
              : 'text-slate-500 hover:bg-slate-100'
              }`}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={() => setView('editor')}
            className={`p-1.5 rounded transition-colors ${view === 'editor'
              ? theme === 'dark'
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-200 text-slate-800'
              : theme === 'dark'
                ? 'bg-transparent text-slate-400 hover:bg-slate-700'
                : 'bg-transparent text-slate-500 hover:bg-slate-100'
              }`}
            title="Editor View"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={() => setView('graph')}
            className={`p-1.5 rounded transition-colors ${view === 'graph'
              ? theme === 'dark'
                ? 'bg-slate-700 text-slate-200'
                : 'bg-slate-200 text-slate-800'
              : theme === 'dark'
                ? 'bg-transparent text-slate-400 hover:bg-slate-700'
                : 'bg-transparent text-slate-500 hover:bg-slate-100'
              }`}
            title="Graph View"
          >
            <Network size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {view === 'editor' ? (
            <Editor
              theme={theme}
              activeNote={activeNote}
              onSave={handleSaveNote}
              onLinkClick={handleLinkClick}
            />
          ) : (
            <GraphView
              theme={theme}
              notes={notes}
              onSelectNode={(node) => {
                if (node && node.path) {
                  // Select file
                  setActiveNote(node)
                  setView('editor')
                }
              }}
              onSelectTag={(tag) => {
                // Filter by tag
                setFilterTags([tag])
                setView('editor')
              }}
            />
          )}

          {view === 'settings' && (
            <Settings theme={theme} onClose={() => setView('editor')} />
          )}
        </div>
      </div>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} theme={theme} />
      <SyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} theme={theme} />
    </div>
  )
}

export default App
