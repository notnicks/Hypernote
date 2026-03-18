export default function AudioBlock({ url, name, theme }) {
  // Simple audio player
  return (
    <div
      className={`my-4 p-4 rounded-lg flex items-center justify-between gap-4 border ${
        theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex flex-col overflow-hidden">
        <span
          className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}
        >
          🎵 {name || 'Audio Attachment'}
        </span>
        <a
          href={url}
          className="text-[10px] text-blue-500 hover:underline mt-1 truncate"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (window.api && window.api.openPath) {
              window.api.openPath(url)
            }
          }}
        >
          {url}
        </a>
      </div>
      <audio controls className="h-10 outline-none w-64 shrink-0">
        <source src={url} type="audio/mpeg" />
        <source src={url} type="audio/wav" />
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}
