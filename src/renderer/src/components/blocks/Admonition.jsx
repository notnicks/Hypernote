import { Info, AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react'

const variants = {
  note: {
    icon: Info,
    color:
      'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    label: 'Note'
  },
  tip: {
    icon: CheckCircle,
    color:
      'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    label: 'Tip'
  },
  warning: {
    icon: AlertTriangle,
    color:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    label: 'Warning'
  },
  caution: {
    icon: AlertOctagon,
    color:
      'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    label: 'Caution'
  }
}

export default function Admonition({ type = 'note', title, children }) {
  const variant = variants[type.toLowerCase()] || variants.note
  const Icon = variant.icon

  return (
    <div className={`my-4 p-4 rounded-lg border flex items-start gap-3 ${variant.color}`}>
      <Icon className="shrink-0 mt-0.5" size={18} />
      <div className="flex-1">
        <div className="font-bold text-sm mb-1">{title || variant.label}</div>
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  )
}
