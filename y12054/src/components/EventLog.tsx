import { useRef, useEffect } from 'react'

interface EventLogProps {
  events: Array<{ id: string; beat: number; type: 'info' | 'warning' | 'error'; message: string }>
}

const TYPE_COLOR: Record<EventLogProps['events'][number]['type'], string> = {
  info: '#00bbff',
  warning: '#ffbb00',
  error: '#ff4444',
}

export default function EventLog({ events }: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [events])

  return (
    <div className="bg-[#1a1a2e] rounded-lg border border-[#3a3a4e] max-h-[240px] overflow-y-auto p-3 scrollbar-thin">
      <div className="font-display text-xs text-gray-400 mb-2">事件日志</div>

      {events.length === 0 ? (
        <div className="text-gray-600 text-xs">等待排练开始...</div>
      ) : (
        <div ref={scrollRef} className="flex flex-col">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-2 py-1 text-xs animate-slide-in">
              <span className="text-[#00ff88] font-display w-8 shrink-0">
                [{event.beat}]
              </span>
              <span
                className="mt-0.5 h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: TYPE_COLOR[event.type] }}
              />
              <span className="text-gray-300">{event.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
