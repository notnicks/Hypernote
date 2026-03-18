import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

// We inject a tiny bit of custom CSS here to fix the dark mode theme,
// rather than modifying the global CSS.
const calendarStyles = `
  .hypernote-calendar.react-calendar {
    width: 100%;
    max-width: 400px;
    background: transparent;
    border: none;
    font-family: inherit;
  }
  .dark .hypernote-calendar.react-calendar {
    color: #f1f5f9;
  }
  .dark .react-calendar__navigation button:enabled:hover,
  .dark .react-calendar__navigation button:enabled:focus {
    background-color: #334155;
  }
  .dark .react-calendar__month-view__days__day--weekend {
    color: #fb7185;
  }
  .dark .react-calendar__tile:enabled:hover,
  .dark .react-calendar__tile:enabled:focus {
    background-color: #334155;
  }
  .dark .react-calendar__tile--now {
    background: #1e3a8a;
  }
  .dark .react-calendar__tile--active {
    background: #2563eb;
  }
  .calendar-event-dot {
    height: 4px;
    width: 4px;
    background-color: #3b82f6;
    border-radius: 50%;
    margin: 2px auto 0;
  }
  .dark .calendar-event-dot {
    background-color: #60a5fa;
  }
`

// Helper to format date as YYYY-MM-DD local time to avoid timezone offset bugs
const formatDate = (date) => {
  const d = new Date(date)
  const pad = (n) => (n < 10 ? '0' + n : n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function CalendarBlock({ content, theme, onUpdate }) {
  // Parse existing events from markdown content
  const [events, setEvents] = useState(() => {
    try {
      const parsed = JSON.parse(content || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [newEventTitle, setNewEventTitle] = useState('')

  const handleAddEvent = () => {
    if (!newEventTitle.trim()) return

    const newEvent = {
      id: Date.now().toString(),
      date: formatDate(selectedDate),
      title: newEventTitle.trim()
    }

    const nextEvents = [...events, newEvent]
    setEvents(nextEvents)
    setNewEventTitle('')

    if (onUpdate) {
      onUpdate(JSON.stringify(nextEvents, null, 2))
    }
  }

  const handleDeleteEvent = (id) => {
    const nextEvents = events.filter((e) => e.id !== id)
    setEvents(nextEvents)
    if (onUpdate) {
      onUpdate(JSON.stringify(nextEvents, null, 2))
    }
  }

  // Parse WikiLinks inside the event title so they look clickable (we can't route natively here easily without prop drilling,
  // but we can optionally format it. In the main editor we intercept clicks).
  const renderTitle = (title) => {
    const parts = title.split(/(\[\[.*?\]\])/g)
    return parts.map((part, i) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const raw = part.slice(2, -2)
        const [target, alias] = raw.split('|')
        const display = alias || target
        return (
          <a
            key={i}
            href={`hypernote://${target}`}
            className="text-blue-500 hover:text-blue-600 hover:underline mx-1"
            onClick={(e) => {
              e.preventDefault()
              if (window.api?.openPath) {
                window.api.openPath(target)
              }
            }}
          >
            {display}
          </a>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  // Which events fall on the currently selected day?
  const selectedDateStr = formatDate(selectedDate)
  const selectedEvents = events.filter((e) => e.date === selectedDateStr)

  return (
    <div
      className={`my-4 p-4 border rounded-xl flex flex-col md:flex-row gap-8 ${theme === 'dark' ? 'border-slate-800 bg-slate-800/30' : 'border-slate-200 bg-white shadow-sm'}`}
    >
      <style>{calendarStyles}</style>

      <div className="flex-1 max-w-sm flex items-start justify-center">
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          className={`hypernote-calendar ${theme === 'dark' ? 'dark' : ''}`}
          tileContent={({ date, view }) => {
            if (view === 'month') {
              const dStr = formatDate(date)
              const dayHasEvents = events.some((e) => e.date === dStr)
              if (dayHasEvents) {
                return <div className="calendar-event-dot"></div>
              }
            }
            return null
          }}
        />
      </div>

      <div
        className={`flex-1 flex flex-col min-w-[250px] ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}
      >
        <h3 className="font-bold text-lg mb-4 border-b pb-2 border-slate-200 dark:border-slate-700">
          {selectedDate.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
        </h3>

        <div className="flex-1 overflow-y-auto mb-4 space-y-2 max-h-48">
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No events</p>
          ) : (
            selectedEvents.map((evt) => (
              <div key={evt.id} className="flex items-center gap-2 group text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <div className="flex-1 break-words">{renderTitle(evt.title)}</div>
                <button
                  onClick={() => handleDeleteEvent(evt.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity"
                  title="Delete event"
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 mt-auto">
          <input
            type="text"
            className={`flex-1 text-sm rounded px-3 py-1.5 border outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
            placeholder="Add an event... [[Link]]"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddEvent()
            }}
          />
          <button
            onClick={handleAddEvent}
            disabled={!newEventTitle.trim()}
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
