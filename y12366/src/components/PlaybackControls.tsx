import { useCallback, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSeismicStore } from '@/store/useSeismicStore'
import type { PlaybackSpeed } from '@/types'

const SPEED_OPTIONS: PlaybackSpeed[] = [0.25, 0.5, 1, 2, 4]

function formatTime(ms: number): string {
  const seconds = Math.max(0, ms / 1000)
  return seconds.toFixed(2).padStart(6, '0')
}

export default function PlaybackControls() {
  const { playback, setPlayback, togglePlayback } = useSeismicStore()
  const { isPlaying, currentTime, speed, startTime, endTime } = playback
  const [speedOpen, setSpeedOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const duration = endTime - startTime
  const elapsed = currentTime - startTime
  const progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 0

  const handleStepBack = useCallback(() => {
    const step = 100 * speed
    setPlayback({ currentTime: Math.max(startTime, currentTime - step) })
  }, [currentTime, speed, startTime, setPlayback])

  const handleStepForward = useCallback(() => {
    const step = 100 * speed
    setPlayback({ currentTime: Math.min(endTime, currentTime + step) })
  }, [currentTime, speed, endTime, setPlayback])

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current || duration <= 0) return
      const rect = barRef.current.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      setPlayback({ currentTime: startTime + ratio * duration })
    },
    [startTime, duration, setPlayback],
  )

  return (
    <div className="flex items-center gap-3 rounded-lg border border-steel-700 bg-steel-900 px-4 py-2.5 shadow-lg">
      <button
        onClick={handleStepBack}
        className="flex h-8 w-8 items-center justify-center rounded-md text-steel-500 transition-colors hover:bg-steel-800 hover:text-slate-200"
      >
        <SkipBack size={16} />
      </button>

      <button
        onClick={togglePlayback}
        className="flex h-9 w-9 items-center justify-center rounded-md bg-steel-700 text-slate-200 transition-colors hover:bg-steel-600"
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>

      <button
        onClick={handleStepForward}
        className="flex h-8 w-8 items-center justify-center rounded-md text-steel-500 transition-colors hover:bg-steel-800 hover:text-slate-200"
      >
        <SkipForward size={16} />
      </button>

      <div className="relative">
        <button
          onClick={() => setSpeedOpen((v) => !v)}
          className="flex h-8 min-w-[56px] items-center justify-center rounded-md border border-steel-600 bg-steel-800 px-2 font-mono text-xs text-slate-300 transition-colors hover:border-steel-500 hover:text-slate-100"
        >
          {speed}x
        </button>
        {speedOpen && (
          <div className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 overflow-hidden rounded-md border border-steel-600 bg-steel-800 shadow-xl">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setPlayback({ speed: s })
                  setSpeedOpen(false)
                }}
                className={cn(
                  'block w-full px-4 py-1.5 text-center font-mono text-xs transition-colors',
                  s === speed
                    ? 'bg-steel-600 text-signal'
                    : 'text-slate-400 hover:bg-steel-700 hover:text-slate-200',
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="font-mono text-sm text-slate-300 tabular-nums">
        {formatTime(elapsed)}
      </span>

      <div
        ref={barRef}
        onClick={handleSeek}
        className="relative h-2 flex-1 cursor-pointer rounded-full bg-steel-700"
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-signal/70 transition-[width] duration-75"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-1.5 -translate-y-1/2 rounded-sm bg-signal shadow-[0_0_6px_rgba(61,220,132,0.5)] transition-[left] duration-75"
          style={{ left: `calc(${progress * 100}% - 3px)` }}
        />
      </div>

      <span className="font-mono text-sm text-steel-500 tabular-nums">
        {formatTime(duration)}
      </span>
    </div>
  )
}
