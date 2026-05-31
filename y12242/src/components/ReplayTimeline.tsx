import { useState, useEffect, useRef } from 'react'
import { Play, Pause } from 'lucide-react'
import type { ReplayEvent } from '@/types'

interface ReplayTimelineProps {
  events: ReplayEvent[]
}

const actionLabels: Record<string, string> = {
  start_case: '开始',
  select_material: '查看',
  submit_judgment: '判定',
  end_case: '结束',
}

function getDotColor(event: ReplayEvent): string {
  if (event.action === 'submit_judgment') {
    return event.detail.includes('错误') || event.detail.includes('trap') ? '#e74c3c' : '#22c55e'
  }
  return '#d4a843'
}

function truncate(text: string, max: number = 30): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export default function ReplayTimeline({ events }: ReplayTimelineProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      setSelectedIndex(prev => {
        if (prev === null) return 0
        if (prev >= events.length - 1) {
          setPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 1500)
    return () => clearInterval(timer)
  }, [playing, events.length])

  useEffect(() => {
    if (selectedIndex !== null && containerRef.current) {
      const nodes = containerRef.current.querySelectorAll('[data-node]')
      nodes[selectedIndex]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [selectedIndex])

  const firstTs = events[0]?.timestamp ?? 0

  return (
    <div className="w-full" style={{ background: '#1a1f2e' }}>
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-amber-400 text-sm font-bold tracking-wide">回放时间线</span>
        <button
          onClick={() => {
            if (!playing && selectedIndex === null) setSelectedIndex(0)
            setPlaying(p => !p)
          }}
          className="flex items-center gap-1 px-3 py-1 rounded bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 transition text-sm"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          {playing ? '暂停' : '播放'}
        </button>
      </div>

      <div ref={containerRef} className="flex items-center overflow-x-auto px-4 py-3 gap-0 scrollbar-thin">
        {events.map((event, i) => {
          const isSelected = selectedIndex === i
          const color = getDotColor(event)
          const offset = `+${Math.round((event.timestamp - firstTs) / 1000)}s`

          return (
            <div key={i} className="flex items-center shrink-0">
              {i > 0 && (
                <div className="w-8 h-0.5 bg-gray-600" />
              )}
              <div
                data-node
                onClick={() => { setSelectedIndex(isSelected ? null : i); setPlaying(false) }}
                className="flex flex-col items-center cursor-pointer group"
              >
                <div
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: isSelected ? 18 : 10,
                    height: isSelected ? 18 : 10,
                    backgroundColor: color,
                    boxShadow: isSelected ? `0 0 12px ${color}` : 'none',
                  }}
                />
                <span className="text-xs mt-1 font-medium" style={{ color }}>
                  {actionLabels[event.action] ?? event.action}
                </span>
                <span className="text-[10px] text-gray-400 max-w-[80px] text-center leading-tight">
                  {truncate(event.detail)}
                </span>
                <span className="text-[10px] text-gray-500">{offset}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
