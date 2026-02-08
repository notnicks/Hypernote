import { X } from 'lucide-react'

export default function HelpModal({ isOpen, onClose, theme }) {
  if (!isOpen) return null

  const cheatSheet = [
    { label: 'Headers', example: '# H1, ## H2, ### H3' },
    { label: 'Bold', example: '**bold text**' },
    { label: 'Italic', example: '*italic text*' },
    { label: 'Blockquote', example: '> blockquote' },
    { label: 'Unordered List', example: '- Item 1\n- Item 2' },
    { label: 'Ordered List', example: '1. First\n2. Second' },
    { label: 'Code', example: '`code`' },
    { label: 'Link', example: '[title](https://...)' },
    { label: 'Image', example: '![alt](https://...)' },
    { label: 'Task List', example: '- [ ] To Do\n- [x] Done' },
    { label: 'Wikilink', example: '[[Note Name]]' },
    { label: 'Tags', example: '#tag' }
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-lg shadow-xl overflow-hidden ${theme === 'dark' ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-900'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex justify-between items-center p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}
        >
          <h2 className="font-bold text-lg">Markdown Help</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-opacity-10 ${theme === 'dark' ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 gap-3">
            {cheatSheet.map((item, index) => (
              <div
                key={index}
                className={`flex flex-col p-2 rounded ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'}`}
              >
                <span
                  className={`text-xs font-semibold uppercase mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  {item.label}
                </span>
                <code
                  className={`text-sm font-mono whitespace-pre-wrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  {item.example}
                </code>
              </div>
            ))}
          </div>
        </div>
        <div
          className={`p-4 border-t text-xs text-center ${theme === 'dark' ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400'}`}
        >
          Click outside to close
        </div>
      </div>
    </div>
  )
}
