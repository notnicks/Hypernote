import { useState, useRef, useEffect } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

export default function ExcalidrawBlock({ content, onUpdate, theme }) {
  const [elements, setElements] = useState(() => {
    try {
      return JSON.parse(content)
    } catch {
      return []
    }
  })

  const lastSavedJson = useRef(content)
  const debounceTimer = useRef(null)

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  // Excalidraw's onChange gives us the current elements and appState
  const handleChange = (newElements) => {
    setElements(newElements)

    // Serialization is expensive, only do it if we're going to use it, but wait!
    // We'll debounce the actual diffing and save down to 1 second.
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      const newContent = JSON.stringify(newElements, null, 2)
      if (newContent !== lastSavedJson.current && onUpdate) {
        lastSavedJson.current = newContent
        onUpdate(newContent)
      }
    }, 1000)
  }

  return (
    <div
      className={`my-4 border rounded-lg overflow-hidden ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
      style={{ height: '500px' }}
    >
      <Excalidraw initialData={{ elements }} onChange={handleChange} theme={theme} />
    </div>
  )
}
