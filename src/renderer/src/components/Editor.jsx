import { useEffect, useState, useCallback, useRef } from 'react'
import { Save, XCircle } from 'lucide-react'
import getCaretCoordinates from 'textarea-caret'
import Mermaid from './Mermaid'
import MathBlock from './blocks/MathBlock'
import CodeBlock from './blocks/CodeBlock'
import Admonition from './blocks/Admonition'
import VideoEmbed from './blocks/VideoEmbed'
import CSVTable from './blocks/CSVTable'
import KanbanBoard from './blocks/KanbanBoard'

// New Advanced Blocks
import ExcalidrawBlock from './blocks/ExcalidrawBlock'
import ChartBlock from './blocks/ChartBlock'
import CalendarBlock from './blocks/CalendarBlock'
import DatabaseBlock from './blocks/DatabaseBlock'
import AudioBlock from './blocks/AudioBlock'
import BookmarkBlock from './blocks/BookmarkBlock'
import InteractiveTasksBlock from './blocks/InteractiveTasksBlock'
import MapBlock from './blocks/MapBlock'

export default function Editor({
  activeNote,
  onSave,
  onDiscard,
  onLinkClick,
  theme,
  draftState,
  onNoteChange
}) {
  const [content, setContent] = useState('')
  const [metadata, setMetadata] = useState({})
  const [tagsString, setTagsString] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isPreview, setIsPreview] = useState(false)

  // Autocomplete State
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteFilter, setAutocompleteFilter] = useState('')
  const [autocompletePos, setAutocompletePos] = useState({ top: 0, left: 0 })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const textareaRef = useRef(null)

  const BLOCKS = [
    { name: 'draw', icon: '✏️', desc: 'Whiteboard', template: '///draw\n\n///\n' },
    {
      name: 'chart',
      icon: '📊',
      desc: 'Recharts Graph',
      template: '///chart\n{"type": "bar", "data": [{"name": "A", "value": 10}]}\n///\n'
    },
    { name: 'calendar', icon: '📅', desc: 'Month View', template: '///calendar\n\n///\n' },
    {
      name: 'database',
      icon: '🗄️',
      desc: 'Data Grid',
      template: '///database\n[{"id": 1, "task": "Hello"}]\n///\n'
    },
    {
      name: 'map',
      icon: '🗺️',
      desc: 'Leaflet Map',
      template: '///map\n{"lat": 51.505, "lng": -0.09, "zoom": 13, "tooltip": "London"}\n///\n'
    },
    {
      name: 'tasks',
      icon: '☑️',
      desc: 'Interactive List',
      template: '///tasks\n- [ ] Todo item\n- [x] Done item\n///\n'
    },
    {
      name: 'mermaid',
      icon: '🧜‍♀️',
      desc: 'Diagram',
      template: '///mermaid\ngraph TD;\n  A-->B;\n///\n'
    },
    { name: 'math', icon: '∑', desc: 'LaTeX Equation', template: '///math\nE = mc^2\n///\n' },
    {
      name: 'csv',
      icon: '📝',
      desc: 'Data Table',
      template: '///csv\nName, Role\nAlice, Dev\n///\n'
    },
    {
      name: 'kanban',
      icon: '📋',
      desc: 'Agile Board',
      template: '///kanban\nTODO:\n- Task 1\nDONE:\n///\n'
    },
    {
      name: 'tip',
      icon: '💡',
      desc: 'Admonition',
      template: '///tip\nThis is a helpful tip!\n///\n'
    }
  ]

  const filteredBlocks = BLOCKS.filter((b) => b.name.includes(autocompleteFilter.toLowerCase()))

  useEffect(() => {
    if (!activeNote) {
      setContent('')
      setMetadata({})
      setTagsString('')
      return
    }

    if (draftState) {
      setContent(draftState.content)
      setMetadata(draftState.metadata)
      setTagsString(draftState.tagsString)
      setIsDirty(true)
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
  }, [activeNote]) // draftState is intentionally omitted to avoid resetting on every keystroke if it updates

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
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleSave])

  const insertBlock = (template) => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const cursor = textarea.selectionStart

    // Find where the trigger '///' started
    const textBeforeCursor = content.substring(0, cursor)
    const match = textBeforeCursor.match(/(^|\n)\/\/\/([a-z]*)$/)

    if (match) {
      const startIdx = match.index + match[1].length
      const newContent = content.substring(0, startIdx) + template + content.substring(cursor)

      setContent(newContent)
      setIsDirty(true)
      notifyChange(newContent, metadata, tagsString)
      setShowAutocomplete(false)

      // Move cursor inside or after the block
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = startIdx + template.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

  const handleKeyDown = (e) => {
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredBlocks.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredBlocks.length) % filteredBlocks.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredBlocks.length > 0) {
          insertBlock(filteredBlocks[selectedIndex].template)
        }
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false)
      }
    }
  }

  const notifyChange = (newContent, newMetadata, newTagsString) => {
    if (onNoteChange && activeNote) {
      onNoteChange(activeNote.path, {
        content: newContent,
        metadata: newMetadata,
        tagsString: newTagsString
      })
    }
  }

  const handleContentChange = (e) => {
    const newContent = e.target.value
    setContent(newContent)
    setIsDirty(true)
    notifyChange(newContent, metadata, tagsString)

    // Check for autocomplete trigger
    const cursor = e.target.selectionStart
    const textBeforeCursor = newContent.substring(0, cursor)

    // Matches /// at start of string or after a newline, followed by optional letters
    const match = textBeforeCursor.match(/(^|\n)\/\/\/([a-z]*)$/)

    if (match) {
      const caret = getCaretCoordinates(e.target, cursor)
      setAutocompletePos({ top: caret.top + 24, left: caret.left })
      setAutocompleteFilter(match[2])
      setShowAutocomplete(true)
      setSelectedIndex(0)
    } else {
      setShowAutocomplete(false)
    }
  }

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    const newMetadata = { ...metadata, title: newTitle }
    setMetadata(newMetadata)
    setIsDirty(true)
    notifyChange(content, newMetadata, tagsString)
  }

  const handleTagsChange = (e) => {
    const newTags = e.target.value
    setTagsString(newTags)
    setIsDirty(true)
    notifyChange(content, metadata, newTags)
  }

  const handleFiles = async (files) => {
    if (!activeNote || !window.api || !window.api.saveAttachment) {
      alert(
        'Attachment API is missing. Please restart the application completely so the main process reloads.'
      )
      return
    }

    let newContent = content

    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'
      const is3mf = file.name && file.name.toLowerCase().endsWith('.3mf')

      if (isImage || isPdf || is3mf) {
        try {
          const arrayBuffer = await file.arrayBuffer()
          // Send to main process as buffer
          const filePayload = {
            data: arrayBuffer,
            name: file.name || '',
            type: file.type || ''
          }

          const result = await window.api.saveAttachment(activeNote.path, filePayload)
          const relPath = typeof result === 'string' ? result : result.path
          const thumbPath =
            typeof result === 'object' && result !== null ? result.thumbPath : undefined

          let attachmentHtml = ''
          if (isImage) {
            attachmentHtml = `<img src="hypernote://${relPath}" alt="${file.name || 'image'}" style="max-width: 100%; border-radius: 4px; margin: 10px 0;" />`
          } else if (isPdf) {
            attachmentHtml = `<embed src="hypernote://${relPath}" type="application/pdf" width="100%" height="600px" style="border: 1px solid #ccc; border-radius: 4px; margin: 10px 0;" />`
          } else if (is3mf) {
            attachmentHtml = `<div style="padding: 10px; border: 1px dashed #ccc; border-radius: 4px; margin: 10px 0; background: rgba(0,0,0,0.05);">`
            if (thumbPath) {
              attachmentHtml += `<a href="hypernote://${relPath}"><img src="hypernote://${thumbPath}" alt="3D Model Thumbnail" style="max-height: 200px; display:block; margin-bottom: 8px; border-radius: 4px;" /></a>`
            }
            attachmentHtml += `<strong>&#128190; 3D Model Attached:</strong> <a href="hypernote://${relPath}" style="color: #3b82f6; text-decoration: underline;">${file.name}</a></div>`
          } else if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav)$/i)) {
            attachmentHtml = `///audio\n${JSON.stringify({ url: `hypernote://${relPath}`, name: file.name })}\n///`
          }

          const textarea = document.getElementById('editor-textarea')
          if (textarea) {
            const start = textarea.selectionStart
            const end = textarea.selectionEnd
            newContent =
              newContent.substring(0, start) +
              '\n' +
              attachmentHtml +
              '\n' +
              newContent.substring(end)

            setTimeout(() => {
              textarea.focus()
              textarea.setSelectionRange(
                start + attachmentHtml.length + 2,
                start + attachmentHtml.length + 2
              )
            }, 0)
          } else {
            newContent += `\n${attachmentHtml}\n`
          }
        } catch (err) {
          console.error('Failed to save attachment', err)
          alert('Failed to save attachment: ' + err.message)
        }
      }
    }

    if (newContent !== content) {
      setContent(newContent)
      setIsDirty(true)
      notifyChange(newContent, metadata, tagsString)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!activeNote) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
      handleFiles(files)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handlePaste = async (e) => {
    if (!activeNote) return

    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault()
      const files = Array.from(e.clipboardData.files)
      handleFiles(files)
    }
  }

  // Simple Markdown + Wikilink Renderer
  const renderPreview = () => {
    if (!content) return null

    // Split by double newline for paragraphs
    const paragraphs = content.split(/\n\n+/)

    return paragraphs.map((block, idx) => {
      // Regex for custom blocks: ///type ... /// (allow EOF)
      // And standard code blocks: ```lang ... ```
      const parts = block.split(/(\/\/\/[a-z]+[\s\S]*?(?:\/\/\/|$)|```[\s\S]*?(?:```|$))/g)

      const blockContent = parts.map((chunk, cIdx) => {
        if (chunk.startsWith('///')) {
          const firstLineEnd = chunk.indexOf('\n')
          const typeEnd = firstLineEnd === -1 ? chunk.length : firstLineEnd
          const type = chunk.slice(3, typeEnd).trim().toLowerCase()

          let blockRawContent = ''
          if (firstLineEnd !== -1) {
            blockRawContent = chunk.slice(firstLineEnd + 1)
          }
          if (blockRawContent.endsWith('///')) {
            blockRawContent = blockRawContent.slice(0, -3).trim()
          }

          const handleBlockUpdate = (newBlockContent) => {
            const newChunk = `///${type}\n${newBlockContent}\n///`
            setContent((prev) => {
              // We must replace the exact old chunk in the current state
              // To be safe against identical chunks, we should really use indexOf,
              // but since replace does first match, it's mostly ok unless there are duplicates.
              const newDocContent = prev.replace(chunk, newChunk)
              setIsDirty(true)
              notifyChange(newDocContent, metadata, tagsString)
              return newDocContent
            })
          }

          switch (type) {
            case 'draw':
            case 'excalidraw':
              return (
                <ExcalidrawBlock
                  key={`${idx}-${cIdx}`}
                  content={blockRawContent}
                  onUpdate={handleBlockUpdate}
                  theme={theme}
                />
              )
            case 'chart':
              return <ChartBlock key={`${idx}-${cIdx}`} content={blockRawContent} theme={theme} />
            case 'calendar':
              return (
                <CalendarBlock
                  key={`${idx}-${cIdx}`}
                  content={blockRawContent}
                  onUpdate={handleBlockUpdate}
                  theme={theme}
                />
              )
            case 'database':
            case 'db':
            case 'table':
              return (
                <DatabaseBlock key={`${idx}-${cIdx}`} content={blockRawContent} theme={theme} />
              )
            case 'audio':
              try {
                const parsed = JSON.parse(blockRawContent)
                return (
                  <AudioBlock
                    key={`${idx}-${cIdx}`}
                    url={parsed.url}
                    name={parsed.name}
                    theme={theme}
                  />
                )
              } catch {
                return (
                  <AudioBlock
                    key={`${idx}-${cIdx}`}
                    url={blockRawContent}
                    name="Audio"
                    theme={theme}
                  />
                )
              }
            case 'bookmark':
            case 'link':
              return <BookmarkBlock key={`${idx}-${cIdx}`} url={blockRawContent} theme={theme} />
            case 'tasks':
            case 'todo':
              return (
                <InteractiveTasksBlock
                  key={`${idx}-${cIdx}`}
                  content={blockRawContent}
                  onUpdate={handleBlockUpdate}
                  theme={theme}
                />
              )
            case 'map':
              return (
                <MapBlock
                  key={`${idx}-${cIdx}`}
                  content={blockRawContent}
                  onUpdate={handleBlockUpdate}
                  theme={theme}
                />
              )
            case 'mermaid':
              return <Mermaid key={`${idx}-${cIdx}`} chart={blockRawContent} theme={theme} />
            case 'math':
              return <MathBlock key={`${idx}-${cIdx}`} content={blockRawContent} />
            case 'csv':
              return <CSVTable key={`${idx}-${cIdx}`} data={blockRawContent} />
            case 'kanban':
              return <KanbanBoard key={`${idx}-${cIdx}`} content={blockRawContent} />
            case 'video':
              return <VideoEmbed key={`${idx}-${cIdx}`} url={blockRawContent} />
            case 'note':
            case 'tip':
            case 'warning':
            case 'caution':
              return (
                <Admonition key={`${idx}-${cIdx}`} type={type} title={type.toUpperCase()}>
                  {blockRawContent}
                </Admonition>
              )
            default:
              return (
                <pre
                  key={`${idx}-${cIdx}`}
                  className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-red-500"
                >
                  Unknown block type: {type}
                </pre>
              )
          }
        }

        if (chunk.startsWith('```') && chunk.endsWith('```')) {
          const lines = chunk.split('\n')
          const firstLine = lines[0].trim()
          const lang = firstLine.replace(/^```/, '').trim().toLowerCase()
          const code = lines.slice(1, -1).join('\n')

          return <CodeBlock key={`${idx}-${cIdx}`} language={lang} code={code} theme={theme} />
        }

        // Regular text processing (WikiLinks and Web Links)
        // Regex to split by WikiLinks [[...]] OR Web Links [text](url)
        const linkParts = chunk.split(/(\[\[.*?\]\]|\[.*?\]\(.*?\))/g)
        const children = linkParts.map((part, i) => {
          // WikiLinks: [[Target|Alias]]
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

          // Web Links: [Text](URL)
          const webLinkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/)
          if (webLinkMatch) {
            const [, text, url] = webLinkMatch
            const isHypernoteUrl = url.startsWith('hypernote://')
            return (
              <a
                key={i}
                href={isHypernoteUrl ? '#' : url}
                target={isHypernoteUrl ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer font-medium flex items-center inline-flex gap-0.5"
                onClick={(e) => {
                  e.stopPropagation()
                  if (isHypernoteUrl) {
                    e.preventDefault()
                    if (window.api && window.api.openPath) {
                      window.api.openPath(url)
                    }
                  }
                }}
              >
                {/* if it has html entities like the floppy disk, dangerouslySetInnerHTML safely allows them in the link text */}
                <span dangerouslySetInnerHTML={{ __html: text }} />
              </a>
            )
          }

          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: part }}
              onClick={(e) => {
                const target = e.target.closest('a')
                if (
                  target &&
                  target.getAttribute('href') &&
                  target.getAttribute('href').startsWith('hypernote://')
                ) {
                  e.preventDefault()
                  e.stopPropagation()
                  if (window.api && window.api.openPath) {
                    window.api.openPath(target.getAttribute('href'))
                  }
                }
              }}
            />
          )
        })

        return <span key={`${idx}-${cIdx}`}>{children}</span>
      })

      return (
        <div
          key={idx}
          className={`mb-4 whitespace-pre-wrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
        >
          {blockContent}
        </div>
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
            {isDirty && (
              <button
                onClick={() => onDiscard && activeNote && onDiscard(activeNote.path)}
                className={`p-1.5 rounded transition-colors ${theme === 'dark' ? 'text-red-400 hover:text-red-200 hover:bg-red-900/40' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
                title="Discard Changes & Exit"
              >
                <XCircle size={16} />
              </button>
            )}
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
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            id="editor-textarea"
            className={`absolute inset-0 w-full h-full p-8 resize-none outline-none font-mono text-sm leading-relaxed bg-transparent ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onPaste={handlePaste}
            placeholder="# Start writing... Use [[WikiLinks]] to connect notes"
            onClick={() => setShowAutocomplete(false)}
          />

          {showAutocomplete && filteredBlocks.length > 0 && (
            <ul
              className={`absolute z-50 w-64 max-h-64 overflow-y-auto rounded-lg shadow-xl border overflow-hidden text-sm ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-slate-200 shadow-slate-900/50'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
              style={{ top: autocompletePos.top + 'px', left: autocompletePos.left + 32 + 'px' }}
            >
              {filteredBlocks.map((block, idx) => (
                <li
                  key={block.name}
                  onClick={() => insertBlock(block.template)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex flex-col px-4 py-2 cursor-pointer transition-colors ${
                    idx === selectedIndex
                      ? theme === 'dark'
                        ? 'bg-blue-600'
                        : 'bg-blue-50 text-blue-700'
                      : theme === 'dark'
                        ? 'hover:bg-slate-700'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span>{block.icon}</span>
                    <span>///{block.name}</span>
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${idx === selectedIndex ? (theme === 'dark' ? 'text-blue-200' : 'text-blue-500') : 'opacity-60'}`}
                  >
                    {block.desc}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
