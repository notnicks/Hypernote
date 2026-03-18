import { X, Book, FileText, Folder, Hash, Network, Search, Command, Activity } from 'lucide-react'
import { useState } from 'react'
import pkg from '../../../../package.json'

export default function HelpModal({ isOpen, onClose, theme }) {
  const [activeTab, setActiveTab] = useState('markdown')

  if (!isOpen) return null

  const sections = [
    {
      id: 'markdown',
      label: 'Markdown',
      icon: <FileText size={16} />,
      content: (
        <div className="space-y-4">
          <p className="text-sm opacity-80">
            Hypernote uses Markdown for formatting. Here is a quick reference:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-3 rounded border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
            >
              <h3 className="font-semibold mb-2 text-sm text-blue-500">Headers</h3>
              <code className="text-xs block bg-black/10 p-1 rounded mb-1"># H1 Large</code>
              <code className="text-xs block bg-black/10 p-1 rounded mb-1">## H2 Medium</code>
              <code className="text-xs block bg-black/10 p-1 rounded">### H3 Small</code>
            </div>
            <div
              className={`p-3 rounded border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
            >
              <h3 className="font-semibold mb-2 text-sm text-blue-500">Emphasis</h3>
              <code className="text-xs block bg-black/10 p-1 rounded mb-1">**Bold Text**</code>
              <code className="text-xs block bg-black/10 p-1 rounded mb-1">*Italic Text*</code>
              <code className="text-xs block bg-black/10 p-1 rounded">~~Strikethrough~~</code>
            </div>
            <div
              className={`p-3 rounded border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
            >
              <h3 className="font-semibold mb-2 text-sm text-blue-500">Lists</h3>
              <code className="text-xs block bg-black/10 p-1 rounded mb-1">- Unordered Item</code>
              <code className="text-xs block bg-black/10 p-1 rounded mb-1">1. Ordered Item</code>
              <code className="text-xs block bg-black/10 p-1 rounded">- [ ] Task Checkbox</code>
            </div>
            <div
              className={`p-3 rounded border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
            >
              <h3 className="font-semibold mb-2 text-sm text-blue-500">Links & Media</h3>
              <code className="text-xs block bg-black/10 p-1 rounded mb-1">
                [[Wiki Link to Note]]
              </code>
              <code className="text-xs block bg-black/10 p-1 rounded mb-1">
                [External Link](url)
              </code>
              <code className="text-xs block bg-black/10 p-1 rounded">![Image Alt](url)</code>
            </div>
            <div
              className={`p-3 rounded border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
            >
              <h3 className="font-semibold mb-2 text-sm text-blue-500">Other</h3>
              <code className="text-xs block bg-black/10 p-1 rounded mb-1">&gt; Blockquote</code>
              <code className="text-xs block bg-black/10 p-1 rounded mb-1">`Inline Code`</code>
              <code className="text-xs block bg-black/10 p-1 rounded">--- (Horizontal Rule)</code>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'organization',
      label: 'Organization',
      icon: <Folder size={16} />,
      content: (
        <div className="space-y-4 text-sm">
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Folder size={18} className="text-blue-500" /> Folders
            </h3>
            <p className="opacity-80 mb-2">Organize your notes hierarchically.</p>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li>
                Click the <b>New Folder</b> icon in the sidebar to create a folder.
              </li>
              <li>Drag and drop notes into folders to move them.</li>
              <li>Click the arrow next to a folder to expand/collapse it.</li>
            </ul>
          </div>
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Hash size={18} className="text-blue-500" /> Tags
            </h3>
            <p className="opacity-80 mb-2">Use tags for flexible categorization.</p>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li>
                Add tags anywhere in your note using <code>#tagname</code>.
              </li>
              <li>
                Nested tags are supported: <code>#work/project-a</code>.
              </li>
              <li>
                Switch to <b>Tags View</b> in the sidebar to browse by tags.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Search size={18} className="text-blue-500" /> Search & Filter
            </h3>
            <p className="opacity-80 mb-2">Find what you need with powerful filtering.</p>
            <div
              className={`p-3 rounded border text-xs font-mono space-y-2 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
            >
              <div>
                <span className="text-blue-500 font-bold">Simple:</span> Type keywords to search
                titles/content.
              </div>
              <div>
                <span className="text-blue-500 font-bold">Boolean:</span>{' '}
                <code>project AND important</code>
              </div>
              <div>
                <span className="text-blue-500 font-bold">Negation:</span>{' '}
                <code>project NOT old</code> or <code>project -old</code>
              </div>
              <div>
                <span className="text-blue-500 font-bold">Tags:</span> Click tags in the sidebar to
                filter.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'linking',
      label: 'Linking',
      icon: <Network size={16} />,
      content: (
        <div className="space-y-4 text-sm">
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Network size={18} className="text-blue-500" /> Graph View
            </h3>
            <p className="opacity-80 mb-2">Visualize connections between your notes.</p>
            <ul className="list-disc pl-5 opacity-80 space-y-1">
              <li>
                Use <code>[[Wiki Links]]</code> to connect notes.
              </li>
              <li>
                Click the <b>Graph View</b> button in the toolbar to see the network.
              </li>
              <li>Nodes are sized by connection count.</li>
              <li>Click a node in the graph to open that note.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2 text-blue-500">Auto-Creation</h3>
            <p className="opacity-80">
              If you create a link to a note that doesn&apos;t exist yet (e.g.,{' '}
              <code>[[Future Idea]]</code>), clicking it will automatically create that note for
              you.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'blocks',
      label: 'Advanced Blocks',
      icon: <Activity size={16} />,
      content: (
        <div className="space-y-4 text-sm">
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" /> Advanced Blocks
            </h3>
            <p className="opacity-80 mb-2">
              Hypernote supports various advanced block types using the <code>{'///type'}</code>{' '}
              syntax.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {[
                {
                  name: 'Mermaid Diagrams',
                  icon: '🧜‍♀️',
                  code: `///mermaid\ngraph TD;\n  A-->B;\n///`
                },
                { name: 'Math (LaTeX)', icon: '∑', code: `///math\nE = mc^2\n///` },
                {
                  name: 'Interactive Tasks',
                  icon: '☑️',
                  code: `///tasks\n- [ ] Todo item\n- [x] Done item\n///`
                },
                {
                  name: 'Excalidraw',
                  icon: '✏️',
                  code: `///draw\n// type ///draw and hit enter\n///`
                },
                {
                  name: 'Charts (Recharts)',
                  icon: '📊',
                  code: `///chart\n{\n  "type": "bar",\n  "data": [\n    {"name": "Jan", "value": 10},\n    {"name": "Feb", "value": 20}\n  ]\n}\n///\n\n// x-axis is 'name'\n// y-axis is 'value'\n// Types: bar, line, pie`
                },
                {
                  name: 'Database Grid',
                  icon: '🗄️',
                  code: `///database\n[{"id": 1, "task": "Hello"}]\n///`
                },
                {
                  name: 'Map (Leaflet)',
                  icon: '🗺️',
                  code: `///map\n{"lat": 51.505, "lng": -0.09, "zoom": 13, "tooltip": "London"}\n///`
                },
                {
                  name: 'Audio Embed',
                  icon: '🎵',
                  code: `///audio\n{"url": "file:///path.mp3", "name": "Song"}\n///`
                },
                {
                  name: 'Web Bookmarks',
                  icon: '🔖',
                  code: `///bookmark\nhttps://www.google.com\n///`
                },
                { name: 'Calendar', icon: '📅', code: `///calendar\n///` },
                {
                  name: 'Admonitions',
                  icon: '💡',
                  code: `///tip\nThis is a helpful tip!\n///\n\n// Supported: tip, warning, caution, note`
                },
                { name: 'CSV Table', icon: '📝', code: `///csv\nName, Role\nAlice, Dev\n///` },
                {
                  name: 'Kanban Board',
                  icon: '📋',
                  code: `///kanban\nTODO:\n- Task 1\nDONE:\n///`
                },
                {
                  name: 'Video Embed',
                  icon: '🎬',
                  code: `///video\nhttps://youtube.com/watch?v=...\n///`
                }
              ].map((block, i) => (
                <div
                  key={i}
                  className={`p-3 rounded border flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  <h3 className="font-semibold mb-2 text-sm text-blue-500 flex items-center gap-2">
                    <span>{block.icon}</span> {block.name}
                  </h3>
                  <div className="bg-black/5 dark:bg-black/20 p-2 rounded max-h-32 overflow-y-auto w-full">
                    <code className="text-[11px] font-mono whitespace-pre-wrap break-all opacity-80 block w-full">
                      {block.code}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'app',
      label: 'App Usage',
      icon: <Command size={16} />,
      content: (
        <div className="space-y-4 text-sm">
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 text-blue-500">Tabs</h3>
            <p className="opacity-80">
              Open multiple notes at once. Tabs appear at the top of the editor. Click <b>X</b> to
              close a tab.
            </p>
          </div>
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 text-blue-500">Dark Mode</h3>
            <p className="opacity-80">
              Toggle between Light and Dark themes using the sun/moon icon in the top right.
            </p>
          </div>
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 text-blue-500">Sync</h3>
            <p className="opacity-80">
              Backup your notes to Google Cloud Storage. Click the cloud icon to configure.
            </p>
          </div>
        </div>
      )
    }
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl h-[80vh] flex flex-col rounded-lg shadow-xl overflow-hidden ${theme === 'dark' ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-900'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex justify-between items-center p-4 border-b shrink-0 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}
        >
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Book className="text-blue-500" /> Help &amp; Guide
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-opacity-10 ${theme === 'dark' ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div
            className={`w-48 border-r overflow-y-auto ${theme === 'dark' ? 'border-slate-700 bg-slate-900/30' : 'border-slate-100 bg-slate-50'}`}
          >
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors
                            ${
                              activeTab === section.id
                                ? theme === 'dark'
                                  ? 'bg-blue-900/30 text-blue-400 border-l-2 border-l-blue-500'
                                  : 'bg-blue-50 text-blue-600 border-l-2 border-l-blue-500'
                                : theme === 'dark'
                                  ? 'text-slate-400 hover:bg-slate-700/50'
                                  : 'text-slate-600 hover:bg-slate-100'
                            }
                        `}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {sections.find((s) => s.id === activeTab)?.content}
          </div>
        </div>

        <div
          className={`p-3 border-t text-xs text-center shrink-0 ${theme === 'dark' ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400'}`}
        >
          Hypernote v{pkg.version}
        </div>
      </div>
    </div>
  )
}
