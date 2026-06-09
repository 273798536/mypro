import { useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

interface PlaybackControlProps {
  playing: boolean
  currentTime: number
  duration?: number
  markers?: number[]
  onPlayPause: () => void
  onSeek: (time: number) => void
  onSkipBackward: () => void
  onSkipForward: () => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function PlaybackControl({
  playing,
  currentTime,
  duration = 100,
  markers = [],
  onPlayPause,
  onSeek,
  onSkipBackward,
  onSkipForward,
}: PlaybackControlProps) {
  const progressRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (playing) {
      intervalRef.current = window.setInterval(() => {
        const nextTime = currentTime + 0.1
        if (nextTime >= duration) {
          onSeek(0)
        } else {
          onSeek(nextTime)
        }
      }, 100)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [playing, currentTime, duration, onSeek])

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(percent * duration)
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <div className="text-xs text-text-muted mb-3">时间回放</div>

      <div className="flex items-center gap-4">
        <button
          onClick={onSkipBackward}
          className="w-9 h-9 flex items-center justify-center rounded-md bg-bg-hover text-text-secondary hover:text-text-primary hover:bg-border transition-colors"
          title="后退10秒"
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={onPlayPause}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
          title={playing ? '暂停' : '播放'}
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <button
          onClick={onSkipForward}
          className="w-9 h-9 flex items-center justify-center rounded-md bg-bg-hover text-text-secondary hover:text-text-primary hover:bg-border transition-colors"
          title="前进10秒"
        >
          <SkipForward size={16} />
        </button>

        <div className="flex-1 relative">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="relative h-2 bg-bg-hover rounded-full cursor-pointer group"
          >
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full"
              style={{ width: `${progressPercent}%` }}
            />

            {markers.map((marker, idx) => (
              <div
                key={idx}
                className="absolute top-0 w-0.5 h-full bg-warning -translate-x-1/2"
                style={{ left: `${marker}%` }}
                title={`关键帧 ${marker}%`}
              />
            ))}

            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progressPercent}% - 7px)` }}
            />
          </div>
        </div>

        <div className="text-sm font-mono text-text-secondary min-w-[90px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  )
}

export default PlaybackControl
