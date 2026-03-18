export default function InteractiveTasksBlock({ content, onUpdate, theme }) {
  // Simple markdown task list parser
  // format:
  // - [ ] Task 1
  // - [x] Task 2

  const lines = content.split('\n')

  const handleToggle = (index) => {
    const newLines = [...lines]
    const line = newLines[index]

    if (line.includes('- [ ]')) {
      newLines[index] = line.replace('- [ ]', '- [x]')
    } else if (line.includes('- [x]')) {
      newLines[index] = line.replace('- [x]', '- [ ]')
    }

    if (onUpdate) {
      onUpdate(newLines.join('\n'))
    }
  }

  // Calculate progress
  const totalTasks = lines.filter((l) => l.includes('- [ ]') || l.includes('- [x]')).length
  const completedTasks = lines.filter((l) => l.includes('- [x]')).length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div
      className={`my-4 p-4 border rounded-xl ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className={`text-sm font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}
        >
          <span className="text-blue-500">☑</span> Tracker
        </h3>
        <span
          className={`text-xs font-mono font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
        >
          {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className={`w-full h-1.5 rounded-full mb-4 overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}
      >
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {lines.map((line, index) => {
          const isUnchecked = line.includes('- [ ]')
          const isChecked = line.includes('- [x]')

          if (!isUnchecked && !isChecked) {
            // Render non-task lines as plain text
            return (
              <div key={index} className="text-sm my-1">
                {line}
              </div>
            )
          }

          const text = line.replace('- [ ]', '').replace('- [x]', '').trim()

          return (
            <label
              key={index}
              className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200/50'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(index)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
              />
              <span
                className={`text-sm select-none ${
                  isChecked
                    ? theme === 'dark'
                      ? 'text-slate-500 line-through'
                      : 'text-slate-400 line-through'
                    : theme === 'dark'
                      ? 'text-slate-300'
                      : 'text-slate-700'
                }`}
              >
                {text}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
