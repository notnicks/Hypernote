export default function KanbanBoard({ content }) {
  const sections = content.split(/\n(?=[A-Z\s]+:)/).filter(Boolean)

  const columns = sections.map((section) => {
    const lines = section.split('\n').filter(Boolean)
    const titleLine = lines[0]
    const title = titleLine.replace(':', '').trim()
    const items = lines
      .slice(1)
      .map((line) => line.replace(/^-\s*(\[ \]|\[x\])?/, '').trim())
      .filter(Boolean)

    return { title, items }
  })

  return (
    <div className="my-4 flex gap-4 overflow-x-auto pb-4">
      {columns.map((col, i) => (
        <div
          key={i}
          className="min-w-[200px] w-64 bg-slate-100 dark:bg-slate-800 rounded-lg p-3 shrink-0"
        >
          <div className="font-bold text-sm mb-3 text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            {col.title}
          </div>
          <div className="space-y-2">
            {col.items.map((item, j) => (
              <div
                key={j}
                className="bg-white dark:bg-slate-700 p-2 rounded shadow-sm text-sm border dark:border-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
