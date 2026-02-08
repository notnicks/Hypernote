import React, { useEffect, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

export default function GraphView({ notes, onSelectNode, onSelectTag, theme }) {
  const containerRef = useRef()
  const [data, setData] = useState({ nodes: [], links: [] })
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const graphNodes = []
    const graphLinks = []

    // Flatten notes to find all files
    const flatNotes = []
    const traverse = (items) => {
      items.forEach((item) => {
        if (item.type === 'file') {
          flatNotes.push(item)
          graphNodes.push({
            id: item.path, // Use path as unique ID
            path: item.path,
            name: item.title,
            group: 2
          })
        } else {
          // Optional: Include folders?
          // For "Network Diagram" users usually want note-to-note.
          // Let's stick to files for now unless requested.
        }

        if (item.children) traverse(item.children)
      })
    }
    traverse(notes)

    // Create links based on Wikilinks (Note to Note)
    const noteLinks = []
    flatNotes.forEach((note) => {
      if (note.links && Array.isArray(note.links)) {
        note.links.forEach((targetTitle) => {
          // Find target path?
          // The wiki link is 'Title', but ID is 'path'.
          // We need to find the node with that title.
          // This is O(N^2) but N is small.
          const targetNode = flatNotes.find((n) => n.title === targetTitle)
          if (targetNode) {
            noteLinks.push({
              source: note.path,
              target: targetNode.path,
              type: 'wiki'
            })
          }
        })
      }
    })

    // Create links based on Tags
    const tagNodes = new Set()
    const tagLinks = []

    // Auxiliary store for hierarchy checks
    const hierarchyLinks = []

    flatNotes.forEach((note) => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach((tag) => {
          const tagName = tag.trim()
          if (!tagName) return

          // Splits "work/project/design" -> ["work", "work/project", "work/project/design"]
          const parts = tagName.split('/')
          let currentPath = ''
          let parentPath = null

          parts.forEach((part, index) => {
            currentPath = index === 0 ? part : `${currentPath}/${part}`

            // Add Tag Node if not exists
            if (!tagNodes.has(currentPath)) {
              tagNodes.add(currentPath)
              graphNodes.push({
                id: `tag-${currentPath}`,
                path: null, // Tags don't have paths
                name: `#${currentPath}`,
                group: 3 // Group 3 for Tags
              })
            }

            // Create Hierarchy Link (Parent -> Child) (will dedupe later)
            if (parentPath) {
              // We don't add strictly here to avoid duplicates during iteration
              // Logic below handles it
            }
            parentPath = currentPath
          })

          // Link Note to the specific Tag (Leaf of usage)
          tagLinks.push({
            source: note.path,
            target: `tag-${tagName}`,
            type: 'tag'
          })
        })
      }
    })

    // Post-process hierarchy links to ensure uniqueness
    const processedLinks = new Set()
    const uniqueHierarchyLinks = []

    Array.from(tagNodes).forEach((tag) => {
      const parts = tag.split('/')
      if (parts.length > 1) {
        const parent = parts.slice(0, -1).join('/')
        const child = tag
        const linkKey = `${parent}->${child}`

        if (!processedLinks.has(linkKey)) {
          processedLinks.add(linkKey)
          uniqueHierarchyLinks.push({
            source: `tag-${parent}`,
            target: `tag-${child}`,
            type: 'hierarchy'
          })
        }
      }
    })

    setData({ nodes: graphNodes, links: [...noteLinks, ...tagLinks, ...uniqueHierarchyLinks] })
  }, [notes])

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        })
      }
    }

    window.addEventListener('resize', updateSize)
    updateSize()

    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`flex-1 h-full relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}
    >
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeLabel="name"
        backgroundColor={theme === 'dark' ? '#0f172a' : '#f8fafc'} // slate-900 : slate-50
        nodeColor={(node) => {
          if (node.group === 1) return '#94a3b8' // Directory (unused)
          if (node.group === 3) return '#10b981' // Tags (Green)
          return '#3b82f6' // Files (Blue)
        }}
        // Scale tag nodes slightly smaller or distinctive?
        nodeVal={(node) => (node.group === 3 ? 1 : 2)}
        linkColor={(link) => {
          if (link.type === 'hierarchy') return theme === 'dark' ? '#f97316' : '#fb923c' // Orange for hierarchy
          if (link.type === 'tag') return theme === 'dark' ? '#10b981' : '#34d399' // Green for tags
          return theme === 'dark' ? '#334155' : '#cbd5e1' // Default slate for wiki
        }}
        nodeRelSize={6}
        linkDirectionalArrowLength={(link) => (link.type === 'wiki' ? 3.5 : 0)} // Arrows for wiki links only
        linkDirectionalArrowRelPos={1}
        linkLineDash={(link) => (link.type === 'tag' ? [2, 2] : null)} // Dotted for tag links
        onNodeClick={(node) => {
          if (node.path) {
            onSelectNode(node)
          } else if (node.group === 3 && onSelectTag) {
            // Tag node clicked
            // Remove "tag-" prefix or use name without #
            const tagName = node.name.replace(/^#/, '')
            onSelectTag(tagName)
          }
        }}
      />
      <div
        className={`absolute bottom-4 right-4 p-3 rounded-lg text-xs backdrop-blur border shadow-lg flex flex-col gap-2 ${theme === 'dark'
          ? 'bg-slate-800/90 text-slate-300 border-slate-700'
          : 'bg-white/90 text-slate-600 border-slate-200'
          }`}
      >
        <div className="font-bold mb-1 opacity-70">Legend</div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>Note (File)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span>Tag</span>
        </div>

        <div className="h-px bg-slate-500/20 my-1"></div>

        <div className="flex items-center gap-2">
          <div className={`w-4 h-0.5 ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
          <span>Wiki Link</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-b-2 border-emerald-400 border-dotted"></div>
          <span>Tag Link</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-orange-400"></div>
          <span>Hierarchy</span>
        </div>
      </div>
    </div>
  )
}
