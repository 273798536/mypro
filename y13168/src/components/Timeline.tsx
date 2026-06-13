import { useRef, useState, useCallback } from 'react'
import { AlertTriangle, Shield, GripVertical } from 'lucide-react'
import { useAttributionStore } from '@/store'
import { cn } from '@/lib/utils'

const RANGE_START = new Date('2025-03-10T00:00:00').getTime()
const RANGE_END = new Date('2025-03-13T23:59:59').getTime()
const TOTAL_MS = RANGE_END - RANGE_START

const ANOMALY_PERIODS = [
  { start: '2025-03-11T02:00:00', end: '2025-03-11T06:00:00' },
  { start: '2025-03-12T10:00:00', end: '2025-03-12T18:00:00' },
  { start: '2025-03-13T05:00:00', end: '2025-03-13T09:00:00' },
]

const THRESHOLD_POSITION = 0.45

const DATE_TICKS = [
  '2025-03-10T00:00:00',
  '2025-03-10T12:00:00',
  '2025-03-11T00:00:00',
  '2025-03-11T12:00:00',
  '2025-03-12T00:00:00',
  '2025-03-12T12:00:00',
  '2025-03-13T00:00:00',
  '2025-03-13T12:00:00',
]

function toPercent(ts: string | number): number {
  const ms = new Date(ts).getTime() - RANGE_START
  return (ms / TOTAL_MS) * 100
}

function formatLabel(ts: string): string {
  const d = new Date(ts)
  const h = d.getHours()
  if (h === 0) return `${d.getMonth() + 1}/${d.getDate()}`
  return `${h}:00`
}

type DragTarget = 'start' | 'end' | 'window' | null

export default function Timeline() {
  const { timeWindow, setTimeWindow } = useAttributionStore()
  const barRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragTarget>(null)
  const dragStartX = useRef(0)
  const dragStartWindow = useRef({ start: 0, end: 0 })

  const startPct = toPercent(timeWindow.start)
  const endPct = toPercent(timeWindow.end)

  const pctToTime = useCallback((pct: number): string => {
    const clamped = Math.max(0, Math.min(100, pct))
    const ms = RANGE_START + (clamped / 100) * TOTAL_MS
    return new Date(ms).toISOString()
  }, [])

  const handlePointerDown = useCallback(
    (target: DragTarget, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDrag(target)
      dragStartX.current = e.clientX
      dragStartWindow.current = { start: startPct, end: endPct }
    },
    [startPct, endPct]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || !barRef.current) return
      const rect = barRef.current.getBoundingClientRect()
      const dx = e.clientX - dragStartX.current
      const dPct = (dx / rect.width) * 100

      if (drag === 'start') {
        const newStart = Math.max(0, Math.min(dragStartWindow.current.start + dPct, dragStartWindow.current.end - 2))
        setTimeWindow({ start: pctToTime(newStart), end: timeWindow.end })
      } else if (drag === 'end') {
        const newEnd = Math.min(100, Math.max(dragStartWindow.current.end + dPct, dragStartWindow.current.start + 2))
        setTimeWindow({ start: timeWindow.start, end: pctToTime(newEnd) })
      } else if (drag === 'window') {
        const width = dragStartWindow.current.end - dragStartWindow.current.start
        let newStart = dragStartWindow.current.start + dPct
        newStart = Math.max(0, Math.min(newStart, 100 - width))
        setTimeWindow({ start: pctToTime(newStart), end: pctToTime(newStart + width) })
      }
    },
    [drag, pctToTime, setTimeWindow, timeWindow]
  )

  const handlePointerUp = useCallback(() => setDrag(null), [])

  return (
    <div className="w-full select-none" style={{ backgroundColor: '#0F1724' }}>
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <Shield size={14} style={{ color: '#2ECC71' }} />
        <span className="text-xs font-medium" style={{ color: '#2ECC71' }}>安全阈值线</span>
        <AlertTriangle size={14} style={{ color: '#FF6B35' }} />
        <span className="text-xs font-medium" style={{ color: '#FF6B35' }}>异常时段</span>
      </div>

      <div
        ref={barRef}
        className="relative mx-4 mb-1"
        style={{ height: 48, backgroundColor: '#1B2A4A', borderRadius: 6 }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {ANOMALY_PERIODS.map((ap, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 opacity-40"
            style={{
              left: `${toPercent(ap.start)}%`,
              width: `${toPercent(ap.end) - toPercent(ap.start)}%`,
              backgroundColor: '#FF6B35',
              borderRadius: 3,
            }}
          />
        ))}

        <div
          className="absolute top-0 bottom-0 w-px z-10"
          style={{ left: `${THRESHOLD_POSITION * 100}%`, backgroundColor: '#2ECC71' }}
        >
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 px-1 rounded text-[9px] whitespace-nowrap"
            style={{ backgroundColor: '#2ECC71', color: '#0F1724' }}
          >
            阈值
          </div>
        </div>

        <div
          className="absolute top-0 bottom-0 cursor-grab active:cursor-grabbing"
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
            backgroundColor: 'rgba(46, 204, 113, 0.12)',
            border: '1px solid rgba(46, 204, 113, 0.4)',
            borderRadius: 4,
          }}
          onPointerDown={(e) => handlePointerDown('window', e)}
        />

        <div
          className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-20 flex items-center justify-center"
          style={{ left: `calc(${startPct}% - 6px)` }}
          onPointerDown={(e) => handlePointerDown('start', e)}
        >
          <GripVertical size={10} style={{ color: '#2ECC71' }} />
        </div>

        <div
          className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-20 flex items-center justify-center"
          style={{ left: `calc(${endPct}% - 6px)` }}
          onPointerDown={(e) => handlePointerDown('end', e)}
        >
          <GripVertical size={10} style={{ color: '#2ECC71' }} />
        </div>
      </div>

      <div className="relative mx-4" style={{ height: 20 }}>
        {DATE_TICKS.map((ts, i) => {
          const pct = toPercent(ts)
          const isMajor = new Date(ts).getHours() === 0
          return (
            <div
              key={i}
              className="absolute top-0"
              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
              <div
                className="mx-auto"
                style={{
                  width: 1,
                  height: isMajor ? 8 : 5,
                  backgroundColor: isMajor ? '#94A3B8' : '#475569',
                }}
              />
              {isMajor && (
                <span className="text-[10px] whitespace-nowrap" style={{ color: '#94A3B8' }}>
                  {formatLabel(ts)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-4 pb-3 flex items-center justify-between text-[10px]" style={{ color: '#64748B' }}>
        <span>2025-03-10</span>
        <span>
          {new Date(timeWindow.start).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit' })}
          {' — '}
          {new Date(timeWindow.end).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit' })}
        </span>
        <span>2025-03-13</span>
      </div>
    </div>
  )
}
