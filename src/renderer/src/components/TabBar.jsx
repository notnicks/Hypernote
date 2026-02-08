import { X, FileText } from 'lucide-react'

export default function TabBar({ tabs, activeTabPath, onTabClick, onTabClose, theme }) {
  if (!tabs || tabs.length === 0) return null

  const handleWheel = (e) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY
    }
  }

  return (
    <div
      className={`flex items-center w-full overflow-x-auto border-b ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}
      onWheel={handleWheel}
    >
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath
        return (
          <div
            key={tab.path}
            className={`
              group flex items-center min-w-[120px] max-w-[200px] h-9 px-3 border-r cursor-pointer text-xs select-none flex-shrink-0
              ${
                isActive
                  ? theme === 'dark'
                    ? 'bg-slate-800 text-slate-100 border-t-2 border-t-blue-500'
                    : 'bg-white text-slate-800 border-t-2 border-t-blue-500'
                  : theme === 'dark'
                    ? 'bg-slate-900 text-slate-400 hover:bg-slate-800 border-t-2 border-t-transparent'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-t-2 border-t-transparent'
              }
              ${theme === 'dark' ? 'border-r-slate-700' : 'border-r-slate-200'}
            `}
            onClick={() => onTabClick(tab.path)}
            title={tab.path}
          >
            <FileText
              size={12}
              className={`mr-2 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-400'}`}
            />
            <span className="truncate flex-1 font-medium">{tab.title}</span>
            <button
              className={`
                ml-2 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity
                ${
                  theme === 'dark'
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-red-400'
                    : 'hover:bg-slate-200 text-slate-500 hover:text-red-600'
                }
              `}
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(tab.path)
              }}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
