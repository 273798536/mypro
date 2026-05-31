import { useEffect, useRef, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { TIME_RANGE, maintenanceRecords } from '@/store/useStore'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

export default function Timeline() {
  const currentTime = useStore((s) => s.currentTime)
  const setCurrentTime = useStore((s) => s.setCurrentTime)
  const isPlaying = useStore((s) => s.isPlaying)
  const setIsPlaying = useStore((s) => s.setIsPlaying)
  const selectedCellId = useStore((s) => s.selectedCellId)
  const getMaintenanceRecords = useStore((s) => s.getMaintenanceRecords)
  const rafRef = useRef<number>(0)
  const lastTickRef = useRef<number>(0)

  const duration = TIME_RANGE.end - TIME_RANGE.start
  const progress = ((currentTime - TIME_RANGE.start) / duration) * 100

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    lastTickRef.current = performance.now()
    const tick = (now: number) => {
      const delta = now - lastTickRef.current
      lastTickRef.current = now
      const increment = delta * 10 * 60 * 1000 / 1000
      const next = currentTime + increment
      if (next >= TIME_RANGE.end) {
        setCurrentTime(TIME_RANGE.end)
        setIsPlaying(false)
        return
      }
      setCurrentTime(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, currentTime, setCurrentTime, setIsPlaying])

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const ratio = Number(e.target.value) / 100
    setCurrentTime(TIME_RANGE.start + ratio * duration)
  }, [duration, setCurrentTime])

  const handleSkipBack = useCallback(() => {
    setCurrentTime(TIME_RANGE.start)
  }, [setCurrentTime])

  const handleSkipForward = useCallback(() => {
    setCurrentTime(TIME_RANGE.end)
  }, [setCurrentTime])

  const handleTogglePlay = useCallback(() => {
    if (!isPlaying && currentTime >= TIME_RANGE.end) {
      setCurrentTime(TIME_RANGE.start)
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, currentTime, setIsPlaying, setCurrentTime])

  const cellRecords = selectedCellId ? getMaintenanceRecords(selectedCellId) : []
  const allRecords = selectedCellId ? cellRecords : maintenanceRecords

  const anomalySegments: { startPct: number; endPct: number; color: string }[] = []
  if (selectedCellId) {
    const cellReadings = useStore.getState().getCellReadings(selectedCellId)
    let segStart: number | null = null
    let segColor = ''
    for (let i = 0; i < cellReadings.length; i++) {
      const r = cellReadings[i]
      const pct = ((r.timestamp - TIME_RANGE.start) / duration) * 100
      const color = r.anomalyType === 'drift'
        ? '#f59e0b'
        : r.anomalyType === 'threshold_version_error'
          ? '#8b5cf6'
          : r.anomalyType === 'missing_sample'
            ? '#ef4444'
            : ''
      if (color && !segStart) {
        segStart = pct
        segColor = color
      } else if (color && color === segColor && segStart !== null) {
        continue
      } else {
        if (segStart !== null && segColor) {
          anomalySegments.push({ startPct: segStart, endPct: pct, color: segColor })
        }
        if (color) {
          segStart = pct
          segColor = color
        } else {
          segStart = null
          segColor = ''
        }
      }
    }
    if (segStart !== null && segColor) {
      anomalySegments.push({ startPct: segStart, endPct: 100, color: segColor })
    }
  }

  return (
    <div className="w-full bg-[#0d1117] border-t border-gray-700 px-6 py-3 flex items-center gap-4 select-none">
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleSkipBack}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <SkipBack size={16} />
        </button>
        <button
          onClick={handleTogglePlay}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={handleSkipForward}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <SkipForward size={16} />
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="relative w-full h-3">
          <div className="absolute inset-0 rounded-full bg-gray-800 overflow-hidden">
            {anomalySegments.map((seg, i) => (
              <div
                key={i}
                className="absolute top-0 h-full opacity-50"
                style={{
                  left: `${seg.startPct}%`,
                  width: `${seg.endPct - seg.startPct}%`,
                  backgroundColor: seg.color,
                }}
              />
            ))}
          </div>
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-blue-500/30 pointer-events-none"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={0.01}
            value={progress}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {allRecords.map((rec) => {
            const pct = ((rec.date - TIME_RANGE.start) / duration) * 100
            if (pct < 0 || pct > 100) return null
            return (
              <div
                key={rec.id}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 border border-cyan-300 pointer-events-none"
                style={{ left: `calc(${pct}% - 4px)` }}
                title={`${rec.type} - ${rec.result}`}
              />
            )
          })}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white rounded-sm pointer-events-none"
            style={{ left: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>{formatTime(TIME_RANGE.start)}</span>
          <span>{formatTime(TIME_RANGE.end)}</span>
        </div>
      </div>

      <div className="shrink-0 text-sm font-mono text-gray-300 min-w-[110px] text-right">
        {formatTime(currentTime)}
      </div>
    </div>
  )
}
