import type { GameEvent } from '@/types'
import { AlertTriangle, UserPlus, UserCheck, UserX, Settings, Wrench } from 'lucide-react'

interface Props {
  events: GameEvent[]
  maxVisible?: number
}

const iconMap: Record<string, React.ReactNode> = {
  arrival: <UserPlus size={14} className="text-milk-500" />,
  service_start: <UserCheck size={14} className="text-window-idle" />,
  service_end: <UserCheck size={14} className="text-window-idle" />,
  no_show: <UserX size={14} className="text-window-disabled" />,
  window_disabled: <Wrench size={14} className="text-window-disabled" />,
  window_enabled: <Settings size={14} className="text-window-idle" />,
  abnormal_duration: <AlertTriangle size={14} className="text-anomaly" />,
  abandon: <UserX size={14} className="text-gray-500" />,
  config_change: <Settings size={14} className="text-milk-400" />,
}

export default function EventLog({ events, maxVisible = 50 }: Props) {
  const visibleEvents = events.slice(-maxVisible)

  return (
    <div className="card max-h-[300px] overflow-y-auto">
      <h3 className="font-bold text-milk-700 text-sm mb-2 sticky top-0 bg-white pb-1">
        📋 事件日志
      </h3>
      <div className="space-y-1">
        {visibleEvents.length === 0 && (
          <div className="text-xs text-milk-400 italic">暂无事件</div>
        )}
        {visibleEvents.map((e, i) => {
          const isAbnormal = ['no_show', 'window_disabled', 'abnormal_duration', 'abandon'].includes(e.type)
          return (
            <div
              key={`${e.tick}-${i}`}
              className={`flex items-start gap-2 text-xs py-1 px-2 rounded-lg ${
                isAbnormal ? 'bg-anomaly/10 text-anomaly' : 'text-milk-600'
              }`}
            >
              <span className="shrink-0 mt-0.5">{iconMap[e.type] ?? <Settings size={14} />}</span>
              <span className="shrink-0 text-milk-400 font-mono">T{e.tick}</span>
              <span className="flex-1">{e.detail}</span>
              <span className="shrink-0 text-milk-300 text-[10px]">{e.triggerSource}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
