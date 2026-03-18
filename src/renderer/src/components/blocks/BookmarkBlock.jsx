import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'

export default function BookmarkBlock({ url, theme }) {
  const [ogData, setOgData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    if (window.api && window.api.fetchOg) {
      window.api.fetchOg(url).then((res) => {
        if (mounted) {
          setOgData(res)
          setLoading(false)
        }
      })
    } else {
      setTimeout(() => {
        if (mounted) setLoading(false)
      }, 0)
    }

    return () => {
      mounted = false
    }
  }, [url])

  if (loading) {
    return (
      <div
        className={`my-4 p-4 border rounded-xl animate-pulse flex gap-4 ${theme === 'dark' ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-100'}`}
      >
        <div
          className={`w-16 h-16 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}
        />
        <div className="flex-1 space-y-2 py-1">
          <div
            className={`h-4 rounded w-3/4 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}
          />
          <div
            className={`h-3 rounded w-1/2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}
          />
        </div>
      </div>
    )
  }

  const title = ogData?.ogTitle || url
  const description = ogData?.ogDescription || ''
  const imageUrl = ogData?.ogImage?.[0]?.url || ''

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`my-4 flex border rounded-xl overflow-hidden transition-colors hover:shadow-sm ${theme === 'dark' ? 'bg-slate-800/20 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}
      style={{ textDecoration: 'none' }}
    >
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        <h3
          className={`font-semibold text-sm truncate mb-1 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}
        >
          {title}
        </h3>
        {description && (
          <p
            className={`text-xs line-clamp-2 mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
          >
            {description}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-blue-500 truncate mt-auto">
          <Link2 size={10} />
          <span className="truncate">{url}</span>
        </div>
      </div>
      {imageUrl && (
        <div className="w-1/3 max-w-[150px] shrink-0 border-l border-inherit bg-slate-100 dark:bg-slate-900">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </a>
  )
}
