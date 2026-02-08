import { useState } from 'react'
import {
  Folder,
  FolderPlus,
  FileText,
  ChevronRight,
  ChevronDown,
  X,
  Filter,
  Trash2,
  Edit2,
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  Clock
} from 'lucide-react'
import clsx from 'clsx'

// -- Helper Functions --

const getAllTags = (nodes) => {
  let tags = {}
  const traverse = (list) => {
    if (!list) return
    list.forEach((node) => {
      if (node.type === 'file') {
        const nodeTags = Array.isArray(node.tags) ? node.tags : []
        nodeTags.forEach((t) => {
          tags[t] = (tags[t] || 0) + 1
        })
      }
      if (node.children) traverse(node.children)
    })
  }
  traverse(nodes)
  return tags
}

const buildTagTree = (tagCounts) => {
  const root = {}

  Object.keys(tagCounts).forEach((tag) => {
    const parts = tag.split('/')
    let current = root

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {
          name: part,
          fullPath: parts.slice(0, index + 1).join('/'),
          count: 0,
          children: {}
        }
      }
      current = current[part].children
    })
  })

  // Populate counts
  const setCounts = (node) => {
    Object.values(node).forEach((item) => {
      item.count = tagCounts[item.fullPath] || 0
      setCounts(item.children)
    })
  }
  setCounts(root)

  return root
}

const checkTerm = (term, node) => {
  const t = term.toLowerCase().replace(/['"]/g, '').trim()
  if (!t) return true
  const safeT = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`\\b${safeT}`, 'i')
  const matchesTitle = node.title && regex.test(node.title)
  const noteTags = Array.isArray(node.tags) ? node.tags : []
  const matchesTags = noteTags.some((tag) => tag && regex.test(tag))
  const matchesContent = node.content && regex.test(node.content)
  return matchesTitle || matchesTags || matchesContent
}

const checkNot = (str, node) => {
  const s = str.trim()
  if (s.startsWith('-')) {
    const term = s.substring(1).trim()
    return !checkTerm(term, node)
  }
  return checkTerm(s, node)
}

const checkAnd = (str, node) => {
  const clean = str.replace(/\bNOT\s+/gi, ' -')
  const parts = clean.split(/\s+/).filter((p) => p.trim())
  const terms = parts.filter((p) => p.toUpperCase() !== 'AND')
  return terms.every((p) => checkNot(p, node))
}

const checkOr = (str, node) => {
  const parts = str.split(/\s+OR\s+/i).filter((p) => p.trim())
  if (parts.length === 0) return true
  return parts.some((p) => checkAnd(p, node))
}

// -- Components --

const FileItem = ({
  node,
  activeNote,
  onSelect,
  onDelete,
  onDrop,
  onRename,
  renamingPath,
  setRenamingPath,
  theme
}) => {
  const [isOpen, setIsOpen] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [editName, setEditName] = useState(node.title)

  const isRenaming = renamingPath === node.path

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    if (node.type === 'directory') {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (node.type === 'directory') {
      const srcPath = e.dataTransfer.getData('text/plain')
      const filename = srcPath.split('/').pop()
      const destPath = node.path + '/' + filename
      onDrop && onDrop(srcPath, destPath)
    }
  }

  const handleRenameSubmit = () => {
    if (editName.trim() && editName !== node.title) {
      const parts = node.path.split('/')
      parts.pop()
      const newPath = parts.length > 0 ? parts.join('/') + '/' + editName : editName
      let finalNewPath = newPath
      if (node.type === 'file' && !newPath.endsWith('.md')) {
        finalNewPath += '.md'
      }
      onRename && onRename(node.path, finalNewPath)
    }
    setRenamingPath(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') setRenamingPath(null)
  }

  if (node.type === 'directory') {
    return (
      <div className="pl-2">
        <div
          className={clsx(
            'group flex items-center py-1 px-2 cursor-pointer select-none rounded border border-transparent',
            theme === 'dark'
              ? 'hover:bg-slate-800 text-slate-200'
              : 'hover:bg-slate-100 text-slate-700',
            isDragOver &&
              (theme === 'dark' ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50')
          )}
          onClick={() => !isRenaming && setIsOpen(!isOpen)}
          draggable={!isRenaming}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isOpen ? (
            <ChevronDown size={14} className="mr-1" />
          ) : (
            <ChevronRight size={14} className="mr-1" />
          )}
          <Folder size={14} className="mr-2 text-blue-500" />

          {isRenaming ? (
            <input
              className={`text-sm font-medium border border-blue-400 rounded px-1 min-w-[100px] ${theme === 'dark' ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-900'}`}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate font-medium flex-1">{node.title}</span>
          )}

          {!isRenaming && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-center ml-2">
              <button
                className="p-1 text-slate-400 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditName(node.title)
                  setRenamingPath(node.path)
                }}
                title="Rename"
              >
                <Edit2 size={12} />
              </button>
              <button
                className="p-1 text-slate-400 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete && onDelete(node.path)
                }}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {isOpen && (
          <div
            className={`border-l ml-3 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
          >
            {node.children.map((child) => (
              <FileItem
                key={child.path}
                node={child}
                activeNote={activeNote}
                onSelect={onSelect}
                onDelete={onDelete}
                onDrop={onDrop}
                onRename={onRename}
                renamingPath={renamingPath}
                setRenamingPath={setRenamingPath}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'group flex items-center py-1 px-4 cursor-pointer select-none rounded mx-1',
        theme === 'dark'
          ? 'hover:bg-slate-800 text-slate-200'
          : 'hover:bg-slate-100 text-slate-700',
        activeNote === node.path &&
          (theme === 'dark'
            ? 'bg-blue-500/20 text-white font-bold border border-blue-500/30'
            : 'bg-blue-100 text-blue-700 font-medium')
      )}
      onClick={() => !isRenaming && onSelect(node)}
      draggable={!isRenaming}
      onDragStart={handleDragStart}
    >
      <FileText size={14} className="mr-2 opacity-50 flex-shrink-0" />

      {isRenaming ? (
        <input
          className={`text-sm border border-blue-400 rounded px-1 flex-1 ${theme === 'dark' ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-900'}`}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-sm truncate flex-1">{node.title}</span>
      )}

      {!isRenaming && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 text-slate-400 hover:text-blue-600"
            onClick={(e) => {
              e.stopPropagation()
              setEditName(node.title)
              setRenamingPath(node.path)
            }}
            title="Rename"
          >
            <Edit2 size={12} />
          </button>
          <button
            className="p-1 text-slate-400 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation()
              onDelete && onDelete(node.path)
            }}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

const TagItem = ({ item, depth = 0, filterTags, onFilterChange, theme }) => {
  const [isOpen, setIsOpen] = useState(true)
  const hasChildren = Object.keys(item.children).length > 0
  const isSelected = filterTags.includes(item.fullPath)

  return (
    <div className="select-none">
      <div
        className={clsx(
          'flex items-center py-1 px-2 cursor-pointer rounded mb-0.5',
          theme === 'dark'
            ? 'hover:bg-slate-800 text-slate-300'
            : 'hover:bg-slate-100 text-slate-700',
          isSelected &&
            (theme === 'dark' ? 'bg-blue-900/40 text-blue-200' : 'bg-blue-50 text-blue-700')
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (isSelected) {
            onFilterChange(filterTags.filter((t) => t !== item.fullPath))
          } else {
            onFilterChange([...filterTags, item.fullPath])
          }
        }}
      >
        {hasChildren ? (
          <div
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(!isOpen)
            }}
            className="mr-1 p-0.5 hover:bg-black/10 rounded"
          >
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </div>
        ) : (
          <span className="w-4" />
        )}

        <span className="text-sm flex-1 truncate">{item.name}</span>
        {item.count > 0 && (
          <span
            className={`text-[10px] px-1.5 rounded-full ${theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}
          >
            {item.count}
          </span>
        )}
      </div>
      {isOpen && hasChildren && (
        <div>
          {Object.values(item.children).map((child) => (
            <TagItem
              key={child.fullPath}
              item={child}
              depth={depth + 1}
              filterTags={filterTags}
              onFilterChange={onFilterChange}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// -- Main Sidebar Component --

export default function Sidebar({
  notes,
  activeNote,
  onSelect,
  onCreateNote,
  onCreateFolder,
  onDeleteNote,
  onMoveNote,
  onRenameItem,
  filterTags = [],
  onFilterChange,
  theme
}) {
  const [viewMode, setViewMode] = useState('files') // 'files' | 'tags'
  const [tagInput, setTagInput] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingPath, setRenamingPath] = useState(null)

  // Sort State
  const [sortOption, setSortOption] = useState('title') // title | dateCreated | dateEdited
  const [sortDirection, setSortDirection] = useState('asc') // asc | desc

  const toggleSort = (option) => {
    if (sortOption === option) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortOption(option)
      setSortDirection('asc')
      if (option === 'dateCreated' || option === 'dateEdited') {
        setSortDirection('desc')
      } else {
        setSortDirection('asc')
      }
    }
  }

  const handleCreateFolderClick = () => {
    setIsCreatingFolder(true)
    setNewFolderName('')
  }

  const handleNewFolderKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (newFolderName.trim()) {
        onCreateFolder && onCreateFolder(newFolderName.trim())
        setIsCreatingFolder(false)
        setNewFolderName('')
      }
    }
    if (e.key === 'Escape') {
      setIsCreatingFolder(false)
      setNewFolderName('')
    }
  }

  // Handle Root Drop
  const handleRootDrop = (e) => {
    e.preventDefault()
    const srcPath = e.dataTransfer.getData('text/plain')
    const filename = srcPath.split('/').pop()
    onMoveNote && onMoveNote(srcPath, filename)
  }

  const handleRootDragOver = (e) => {
    e.preventDefault()
  }

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const prepared = tagInput.trim().replace(/\bNOT\s+/gi, '-')
      const rawTags = prepared.split(/\s+/)
      const validTags = rawTags.filter((t) => !['AND', 'OR', 'NOT'].includes(t.toUpperCase()))
      const currentSet = new Set(filterTags)
      const toAdd = validTags.filter((t) => !currentSet.has(t))

      if (toAdd.length > 0) {
        onFilterChange && onFilterChange([...filterTags, ...toAdd])
      }
      setTagInput('')
    }
  }

  const removeTag = (tag) => {
    onFilterChange && onFilterChange(filterTags.filter((t) => t !== tag))
  }

  // Calculate Data
  const tagCounts = getAllTags(notes)
  const tagTree = buildTagTree(tagCounts)

  const filterNodes = (nodes) => {
    const hasTags = filterTags && filterTags.length > 0
    const hasText = tagInput && tagInput.trim().length > 0

    if (!hasTags && !hasText) return nodes

    return nodes.reduce((acc, node) => {
      if (node.type === 'file') {
        const matchesTags = !hasTags || filterTags.every((t) => checkAnd(t, node))
        const matchesSearch = !hasText || checkOr(tagInput, node)
        if (matchesTags && matchesSearch) acc.push(node)
      } else if (node.type === 'directory') {
        const filteredChildren = filterNodes(node.children || [])
        if (filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren })
        }
      }
      return acc
    }, [])
  }

  const sortNodes = (nodes) => {
    return [...nodes]
      .sort((a, b) => {
        let comparison = 0
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        switch (sortOption) {
          case 'title':
            comparison = a.title.localeCompare(b.title)
            break
          case 'dateCreated':
            comparison = new Date(a.dateCreated || 0) - new Date(b.dateCreated || 0)
            break
          case 'dateEdited':
            comparison = new Date(a.dateEdited || 0) - new Date(b.dateEdited || 0)
            break
          default:
            comparison = 0
        }
        return sortDirection === 'asc' ? comparison : -comparison
      })
      .map((node) => {
        if (node.type === 'directory' && node.children) {
          return { ...node, children: sortNodes(node.children) }
        }
        return node
      })
  }

  const filteredNotes = filterNodes(notes || [])
  const sortedNotes = sortNodes(filteredNotes)

  return (
    <div
      className={`h-full flex flex-col border-r w-64 ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
      onDrop={handleRootDrop}
      onDragOver={handleRootDragOver}
    >
      <div
        className={`px-4 pb-4 pt-12 border-b flex flex-col gap-3 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
      >
        <div className="flex justify-between items-center">
          <div
            className={`flex p-0.5 rounded-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}`}
          >
            <button
              onClick={() => setViewMode('files')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'files'
                  ? theme === 'dark'
                    ? 'bg-slate-700 text-white shadow'
                    : 'bg-white text-slate-900 shadow'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setViewMode('tags')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'tags'
                  ? theme === 'dark'
                    ? 'bg-slate-700 text-white shadow'
                    : 'bg-white text-slate-900 shadow'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Tags
            </button>
          </div>

          <div className="flex gap-1">
            {viewMode === 'files' && (
              <>
                <button
                  onClick={handleCreateFolderClick}
                  className={`px-1 py-1 rounded transition ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                  title="New Folder"
                >
                  <FolderPlus size={16} />
                </button>
                <button
                  onClick={() => onCreateNote()}
                  className="text-xs bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-700 transition"
                >
                  + Note
                </button>
              </>
            )}
          </div>
        </div>

        {viewMode === 'files' && isCreatingFolder && (
          <div className="flex items-center px-4 py-1 gap-2">
            <Folder size={14} className="text-blue-500" />
            <input
              className={`text-xs border border-blue-400 rounded px-1 w-full outline-none ${theme === 'dark' ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-900'}`}
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleNewFolderKey}
              autoFocus
            />
          </div>
        )}

        {viewMode === 'files' && (
          <div
            className={`flex gap-1 border-t pt-1 justify-end ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}
          >
            <button
              onClick={() => toggleSort('title')}
              className={clsx(
                'p-1 rounded',
                theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100',
                sortOption === 'title' &&
                  (theme === 'dark' ? 'text-blue-400 bg-blue-900/40' : 'text-blue-600 bg-blue-50')
              )}
              title="Sort by Name"
            >
              {sortOption === 'title' && sortDirection === 'desc' ? (
                <ArrowUpAZ size={14} />
              ) : (
                <ArrowDownAZ size={14} />
              )}
            </button>
            <button
              onClick={() => toggleSort('dateCreated')}
              className={clsx(
                'p-1 rounded',
                theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100',
                sortOption === 'dateCreated' &&
                  (theme === 'dark' ? 'text-blue-400 bg-blue-900/40' : 'text-blue-600 bg-blue-50')
              )}
              title="Sort by Created Date"
            >
              <Calendar size={14} />
            </button>
            <button
              onClick={() => toggleSort('dateEdited')}
              className={clsx(
                'p-1 rounded',
                theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100',
                sortOption === 'dateEdited' &&
                  (theme === 'dark' ? 'text-blue-400 bg-blue-900/40' : 'text-blue-600 bg-blue-50')
              )}
              title="Sort by Updated Date"
            >
              <Clock size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="relative flex items-center">
            <Filter size={12} className="absolute left-2 text-slate-400" />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Filter/Search (AND/OR/NOT)..."
              className={`w-full pl-7 pr-2 py-1 text-xs border rounded outline-none focus:border-blue-300 placeholder:text-slate-400 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
            />
          </div>
          {filterTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filterTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-medium border border-blue-200"
                >
                  {tag}
                  <X
                    size={10}
                    className="cursor-pointer hover:text-blue-800 ml-1"
                    onClick={() => removeTag(tag)}
                  />
                </span>
              ))}
              <button
                onClick={() => onFilterChange([])}
                className="text-[10px] text-slate-400 underline ml-1"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {viewMode === 'files' ? (
          <>
            {sortedNotes.map((node) => (
              <FileItem
                key={node.path}
                node={node}
                activeNote={activeNote}
                onSelect={onSelect}
                onDelete={onDeleteNote}
                onDrop={onMoveNote}
                onRename={onRenameItem}
                renamingPath={renamingPath}
                setRenamingPath={setRenamingPath}
                theme={theme}
              />
            ))}
            {filteredNotes.length === 0 && (
              <div className="text-xs text-slate-400 text-center mt-4">No matching notes</div>
            )}
          </>
        ) : (
          <div className="pb-4">
            {Object.values(tagTree).length === 0 && (
              <div className="text-xs text-slate-400 text-center mt-4">No tags found</div>
            )}
            {Object.values(tagTree)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((item) => (
                <TagItem
                  key={item.fullPath}
                  item={item}
                  filterTags={filterTags}
                  onFilterChange={onFilterChange}
                  theme={theme}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
