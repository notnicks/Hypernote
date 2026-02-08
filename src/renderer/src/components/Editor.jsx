import React, { useEffect, useState, useCallback } from 'react'
import { Save } from 'lucide-react'

export default function Editor({ activeNote, onSave, onLinkClick, theme }) {
  const [content, setContent] = useState('')
  const [metadata, setMetadata] = useState({})
  const [tagsString, setTagsString] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    if (!activeNote) {
      setContent('')
      setMetadata({})
      setTagsString('')
      return
    }

    setLoading(true)
    window.api
      .readNote(activeNote.path)
      .then((data) => {
        setContent(data.content || '')
        const meta = data.data || {}
        setMetadata(meta)
        const tags = meta.tags
        setTagsString(Array.isArray(tags) ? tags.join(', ') : tags || '')

        setLoading(false)
        setIsDirty(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [activeNote])

  const handleSave = useCallback(() => {
    if (activeNote && isDirty) {
      const tags = tagsString
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean)

      const now = new Date().toISOString()
      const newMetadata = {
        ...metadata,
        tags,
        dateEdited: now,
        dateCreated: metadata.dateCreated || now
      }

      onSave(activeNote.path, content, newMetadata)
      setMetadata(newMetadata)
      setIsDirty(false)
    }
  }, [activeNote, content, metadata, tagsString, isDirty, onSave])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const handleContentChange = (e) => {
    setContent(e.target.value)
    setIsDirty(true)
  }

  const handleTitleChange = (e) => {
    setMetadata((prev) => ({ ...prev, title: e.target.value }))
    setIsDirty(true)
  }

  const handleTagsChange = (e) => {
    setTagsString(e.target.value)
    setIsDirty(true)
  }

  // Simple Markdown + Wikilink Renderer
  const renderPreview = () => {
    if (!content) return null

    // Split by double newline for paragraphs
    const paragraphs = content.split(/\n\n+/)

    return paragraphs.map((block, idx) => {
      // Regex for [[Link]]
      const parts = block.split(/(\[\[.*?\]\])/g)

      const children = parts.map((part, i) => {
        if (part.startsWith('[[') && part.endsWith(']]')) {
          const raw = part.slice(2, -2) // remove [[ ]]
          const [target, alias] = raw.split('|')
          const display = alias || target

          return (
            <span
              key={i}
              onClick={() => onLinkClick && onLinkClick(target)}
              className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer font-medium"
              title={`Open ${target}`}
            >
              {display}
            </span>
          )
        }
        return part
      })

      return (
        <p
          key={idx}
          className={`mb-4 whitespace-pre-wrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
        >
          {children}
        </p>
      )
    })
  }

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-300">
        Select a note to edit
      </div>
    )
  }

  if (loading) {
    return <div className="flex-1 p-8 text-slate-400">Loading...</div>
  }

  return (
    <div
      className={`flex-1 flex flex-col h-full ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}
    >
      <div
        className={`border-b p-4 flex flex-col gap-2 ${theme === 'dark' ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}
      >
        <div className="flex justify-between items-start">
          <input
            type="text"
            value={metadata.title || ''}
            onChange={handleTitleChange}
            placeholder="Note Title"
            className={`text-xl font-bold bg-transparent outline-none placeholder:text-slate-300 w-full ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}
          />
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-colors border ${
                isPreview
                  ? theme === 'dark'
                    ? 'bg-slate-700 text-blue-300 border-blue-500/30'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                  : theme === 'dark'
                    ? 'text-slate-400 border-slate-700 hover:bg-slate-800'
                    : 'text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isPreview ? 'Edit' : 'Preview'}
            </button>
            {isDirty && <span className="text-xs text-amber-500 font-medium">Changed</span>}
            <button
              onClick={handleSave}
              className={`p-1.5 rounded transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'} ${isDirty ? (theme === 'dark' ? 'text-blue-400 bg-blue-900/40' : 'text-blue-600 bg-blue-50 hover:bg-blue-100') : ''}`}
              title="Save (Cmd+S)"
            >
              <Save size={16} />
            </button>
          </div>
        </div>
        <input
          type="text"
          value={tagsString}
          onChange={handleTagsChange}
          placeholder="Tags (comma separated)"
          className={`text-xs font-mono bg-transparent outline-none placeholder:text-slate-300 w-full ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
        />
        <div className="flex gap-4 mt-2 text-[10px] text-slate-400 font-mono">
          {metadata.dateCreated && (
            <span>Created: {new Date(metadata.dateCreated).toLocaleString()}</span>
          )}
          {metadata.dateEdited && (
            <span>Edited: {new Date(metadata.dateEdited).toLocaleString()}</span>
          )}
        </div>
      </div>

      {isPreview ? (
        <div className="flex-1 w-full h-full p-8 overflow-y-auto">{renderPreview()}</div>
      ) : (
        <textarea
          className={`flex-1 w-full h-full p-8 resize-none outline-none font-mono text-sm leading-relaxed bg-transparent ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}
          value={content}
          onChange={handleContentChange}
          placeholder="# Start writing... Use [[WikiLinks]] to connect notes"
        />
      )}
    </div>
  )
}
