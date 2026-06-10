import { CheckCircle2, Upload, FileText, AlertCircle } from 'lucide-react'

export interface TimelineEntry {
  id: string
  action: string
  operator: string
  detail?: string
  timestamp: string
  isCurrent?: boolean
}

const iconMap: Record<string, typeof CheckCircle2> = {
  import: Upload,
  analyze: FileText,
  review: CheckCircle2,
  reject: AlertCircle,
  default: FileText,
}

function getIcon(action: string) {
  const key = Object.keys(iconMap).find((k) => action.toLowerCase().includes(k))
  return key ? iconMap[key] : iconMap.default
}

interface TimelineProps {
  entries: TimelineEntry[]
}

export default function Timeline({ entries }: TimelineProps) {
  return (
    <div className="relative">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />
      <div className="space-y-4">
        {entries.map((entry) => {
          const Icon = getIcon(entry.action)
          return (
            <div key={entry.id} className="relative flex gap-3 pl-1">
              <div
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  entry.isCurrent
                    ? 'bg-amber-500 text-white animate-pulse-dot'
                    : 'bg-white border-2 border-gray-300 text-cool-gray'
                }`}
              >
                <Icon size={12} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-indigo-900">
                    {entry.action}
                  </span>
                  <span className="text-xs text-cool-gray whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="text-xs text-cool-gray mt-0.5">
                  {entry.operator}
                  {entry.detail && <span className="ml-1">· {entry.detail}</span>}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
