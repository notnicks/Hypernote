import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import GraphView from './components/GraphView'
import HelpModal from './components/HelpModal'
import SyncModal from './components/SyncModal'
import Settings from './components/Settings'
import TabBar from './components/TabBar'
import { Network, Edit3, Sun, Moon, HelpCircle, UploadCloud, Download } from 'lucide-react'

function App() {
  const [notes, setNotes] = useState([])
  const [view, setView] = useState('editor') // 'editor' | 'graph'

  // Tab State
  const [openTabs, setOpenTabs] = useState([])
  const [activeTabPath, setActiveTabPath] = useState(null)

  // Unsaved Edits State: { [path]: { content, metadata, tagsString, isDirty } }
  const [unsavedEdits, setUnsavedEdits] = useState({})

  const [filterTags, setFilterTags] = useState([])
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('theme') || 'light'
    }
    return 'light'
  })

  // Derived state for active note
  const activeNote = activeTabPath
    ? notes.find((n) => n.path === activeTabPath) ||
    findNoteByTitle(notes, openTabs.find((t) => t.path === activeTabPath)?.title) ||
    // Fallback: create skeleton if not loaded yet
    (() => {
      const tab = openTabs.find((t) => t.path === activeTabPath)
      return tab ? { path: tab.path, title: tab.title, content: '', type: 'file' } : null
    })()
    : null

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
  function findNoteByTitle(nodes, title) {
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

  // -- Tab Management --

  const handleOpenNote = (note) => {
    if (!note) return

    // Check if already open
    const isOpen = openTabs.some((tab) => tab.path === note.path)
    if (!isOpen) {
      setOpenTabs((prev) => [...prev, { path: note.path, title: note.title }])
    }
    setActiveTabPath(note.path)
    setView('editor')
  }

  const handleCloseTab = async (path, force = false) => {
    // Check for unsaved edits
    if (!force && unsavedEdits[path]) {
      const { response } = await window.api.showConfirmDialog({
        type: 'question',
        buttons: ['Save', 'Discard', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: 'Unsaved Changes',
        message: 'Do you want to save the changes you made?',
        detail: `Your changes to ${path} will be lost if you don't save them.`
      })

      if (response === 2) {
        // Cancel - do nothing
        return
      }

      if (response === 0) {
        // Save
        const data = unsavedEdits[path]
        await handleSaveNote(path, data.content, data.metadata)
      }

      // If response === 1 (Discard), we just fall through to close logic below
    }

    setOpenTabs((prev) => {
      const newTabs = prev.filter((t) => t.path !== path)
      if (activeTabPath === path) {
        // If closing active tab, switch to the last one or null
        const closedIndex = prev.findIndex((t) => t.path === path)
        let nextActive = null
        if (newTabs.length > 0) {
          // Try to go to near neighbor
          const nextIndex = Math.min(closedIndex, newTabs.length - 1)
          nextActive = newTabs[nextIndex].path
        }
        setActiveTabPath(nextActive)
      }
      return newTabs
    })

    // Clean up unsaved edits for the closed tab
    setUnsavedEdits((prev) => {
      const newEdits = { ...prev }
      delete newEdits[path]
      return newEdits
    })
  }

  const handleDiscardChanges = (path) => {
    // Ideally this just wraps handleCloseTab but forces bypassing the check?
    // Actually handleCloseTab checks if unsavedEdits exists.
    // So if we remove it first, then close...

    setUnsavedEdits((prev) => {
      const newEdits = { ...prev }
      delete newEdits[path]
      return newEdits
    })

    // We need to wait for state update? Or just call close?
    // State updates are async. Maybe we can pass a flag to handleCloseTab?
    // Or just implement the close logic here directly to be safe?
    // Or better: update handleCloseTab to accept a force flag?

    // Let's just implement a direct close for simplicity and reliability here
    // But since handleCloseTab manages active tab switching logic, better to reuse.

    // Trick: If we know for sure we want to discard, we can just delete from state 
    // AND then call close. But race condition might occur if handleCloseTab reads old state.
    // Actually, state updates are batched. 
    // Let's modify handleCloseTab to accept an optional 'force' param?
    // Or just call window.api.readNote to "revert" if we weren't closing?
    // The user said "exit without saving". So close tab.

    // Let's do this:
    // 1. Clear unsaved edits (so handleCloseTab won't prompt)
    // 2. Call handleCloseTab

    // To avoid race condition, let's just use strict logic in handleCloseTab
    // or pass a second arg to it? `handleCloseTab(path, force = false)`
    handleCloseTab(path, true)
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
    try {
      await window.api.createNote(name, `# ${titleToUse}`, { title: titleToUse })
      // Auto-open immediately
      handleOpenNote({ path: name, title: titleToUse, type: 'file' })
    } catch (e) {
      console.error('Failed to create note', e)
    }
  }

  const handleNoteChange = (path, data) => {
    setUnsavedEdits((prev) => ({
      ...prev,
      [path]: data
    }))
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

            // Update tabs
            setOpenTabs((prev) =>
              prev.map((t) =>
                t.path === path ? { ...t, path: newPath, title: metadata.title } : t
              )
            )
            if (activeTabPath === path) {
              setActiveTabPath(newPath)
            }
          } catch (e) {
            console.error('Rename failed', e)
          }
        }
      }
    }
    await window.api.writeNote(targetPath, content, metadata)

    // Clear unsaved edits after successful save
    setUnsavedEdits((prev) => {
      const newEdits = { ...prev }
      delete newEdits[path] // Delete old path key
      if (targetPath !== path) {
        delete newEdits[targetPath] // Just in case
      }
      return newEdits
    })
  }

  const handleDeleteNote = async (path) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await window.api.deleteNote(path)
        // Close tab if open
        const isOpen = openTabs.some((t) => t.path === path)
        if (isOpen) {
          handleCloseTab(path)
        }
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
      // Update tabs if moved note was open
      setOpenTabs((prev) => {
        return prev.map((t) => {
          if (t.path === srcPath) {
            // We need the new title? Or just path.
            // Re-deriving title might happen on next loadNotes.
            return { ...t, path: destPath }
          }
          return t
        })
      })
      if (activeTabPath === srcPath) {
        setActiveTabPath(destPath)
      }
    } catch (e) {
      console.error('Failed to move note', e)
    }
  }

  const handleRenameItem = async (oldPath, newName) => {
    try {
      await window.api.renameNote(oldPath, newName)
      // Tabs update is tricky without knowing the full new path immediately,
      // but onNoteUpdate will reload notes.
      // However, we should probably update state if we can to avoid glitches.
      // For now, rely on sync or handleSaveNote if it's the active note being renamed via Editor.
    } catch (e) {
      console.error('Rename failed', e)
    }
  }

  const handleImportNote = async () => {
    try {
      const importedPath = await window.api.importNote()
      if (importedPath) {
        await loadNotes()
        // Optionally find the new note and open it
        // We know the path is imports/filename.md usually, but let's find the exact node
        const note =
          notes.find((n) => n.path === importedPath) ||
          findNoteByTitle(notes, importedPath.split('/').pop().replace('.md', ''))

        if (note) {
          handleOpenNote(note)
        } else {
          // Fallback: try to wait or manually construct object to open tab
          setOpenTabs((prev) => [
            ...prev,
            { path: importedPath, title: importedPath.split('/').pop() }
          ])
          setActiveTabPath(importedPath)
          setView('editor')
        }
      }
    } catch (e) {
      console.error('Failed to import note', e)
      alert('Failed to import note: ' + e.message)
    }
  }

  const handleLinkClick = async (targetTitle) => {
    const target = findNoteByTitle(notes, targetTitle)

    if (target) {
      handleOpenNote(target)
    } else {
      if (confirm(`Note "${targetTitle}" not found. Create it?`)) {
        const name = targetTitle.trim() + '.md'
        await window.api.createNote(name, `# ${targetTitle}\n\n`, { title: targetTitle })
        await loadNotes()
        // Try to open it after a delay
        setTimeout(() => {
          // We can trigger a reload and then try to find it?
          // Or just let user open it.
        }, 500)
      }
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900">
      <Sidebar
        theme={theme}
        notes={notes}
        activeNote={activeTabPath}
        onSelect={handleOpenNote}
        onCreateNote={handleCreateNote}
        onCreateFolder={handleCreateFolder}
        onMoveNote={handleMoveNote}
        onRenameItem={handleRenameItem}
        onDeleteNote={handleDeleteNote}
        filterTags={filterTags}
        onFilterChange={setFilterTags}
      />

      <div
        className={`flex-1 flex flex-col h-full min-w-0 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}
      >
        <div
          className={`h-12 border-b flex justify-end items-center px-4 gap-2 shrink-0 ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
            }`}
        >
          <button
            onClick={handleImportNote}
            className={`p-1.5 rounded bg-transparent transition-colors mr-2 ${theme === 'dark'
              ? 'text-slate-400 hover:bg-slate-700'
              : 'text-slate-500 hover:bg-slate-100'
              }`}
            title="Import Note"
          >
            <Download size={18} />
          </button>
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

        {view === 'editor' && (
          <TabBar
            tabs={openTabs}
            activeTabPath={activeTabPath}
            onTabClick={(path) => setActiveTabPath(path)}
            onTabClose={handleCloseTab}
            theme={theme}
          />
        )}

        <div className="flex-1 overflow-hidden relative">
          {view === 'editor' ? (
            <Editor
              theme={theme}
              activeNote={activeNote}
              onSave={handleSaveNote}
              onDiscard={handleDiscardChanges}
              onLinkClick={handleLinkClick}
              draftState={activeTabPath ? unsavedEdits[activeTabPath] : null}
              onNoteChange={handleNoteChange}
            />
          ) : (
            <GraphView
              theme={theme}
              notes={notes}
              onSelectNode={(node) => {
                if (node && node.path) {
                  handleOpenNote(node)
                }
              }}
              onSelectTag={(tag) => {
                // Filter by tag
                setFilterTags([tag])
                setView('editor')
              }}
            />
          )}

          {view === 'settings' && <Settings theme={theme} onClose={() => setView('editor')} />}
        </div>
      </div>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} theme={theme} />
      <SyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} theme={theme} />
    </div>
  )
}

export default App
