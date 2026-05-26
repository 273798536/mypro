import { useState, useEffect, useRef } from 'react'
import { useSceneStore } from '../../store/useSceneStore'
import { useDataStore } from '../../store/useDataStore'
import { formatTime } from '../../utils/timeUtils'

export function Timeline() {
  const { currentTime, isPlaying, playbackSpeed, setCurrentTime, setIsPlaying, setPlaybackSpeed } = useSceneStore()
  const { alerts, dataQualityIssues } = useDataStore()
  const [range] = useState({ start: new Date(Date.now() - 2 * 60 * 60 * 1000), end: new Date() })
  const animationRef = useRef<number | null>(null)

  const progress = ((currentTime.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * 100

  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setCurrentTime(new Date(currentTime.getTime() + playbackSpeed * 1000))
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, playbackSpeed, currentTime, setCurrentTime])

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = new Date(range.start.getTime() + percentage * (range.end.getTime() - range.start.getTime()))
    setCurrentTime(newTime)
  }

  const gapMarkers = dataQualityIssues.filter((i) => i.type === 'gap').map((issue) => ({
    position: ((issue.timestamp.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * 100,
    type: 'gap' as const,
  }))

  const alertMarkers = alerts
    .filter((a) => a.timestamp >= range.start && a.timestamp <= range.end)
    .map((alert) => ({
      position: ((alert.timestamp.getTime() - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * 100,
      level: alert.level,
    }))

  return (
    <div className="glass-panel px-4 py-3">
      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-10 h-10 rounded-full bg-dc-primary text-white flex items-center justify-center hover:bg-dc-primary/80 transition-colors"
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <div className="flex gap-1">
          {[0.25, 0.5, 1, 2, 4].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed as any)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                playbackSpeed === speed
                  ? 'bg-dc-primary text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        <div className="flex-1 text-center">
          <span className="text-2xl font-mono text-dc-accent">{formatTime(currentTime)}</span>
        </div>

        <div className="text-xs text-gray-400">
          {formatTime(range.start)} - {formatTime(range.end)}
        </div>
      </div>

      <div
        className="relative h-8 bg-black/30 rounded cursor-pointer overflow-hidden"
        onClick={handleTimelineClick}
      >
        <div
          className="absolute top-0 left-0 h-full bg-dc-primary/20"
          style={{ width: `${progress}%` }}
        />

        {alertMarkers.map((marker, idx) => (
          <div
            key={`alert-${idx}`}
            className="absolute top-1 w-1 h-6 rounded-full"
            style={{
              left: `${marker.position}%`,
              backgroundColor: marker.level === 'critical' ? '#F44336' : marker.level === 'warning' ? '#FF9800' : '#2196F3',
              opacity: 0.8,
            }}
          />
        ))}

        {gapMarkers.map((marker, idx) => (
          <div
            key={`gap-${idx}`}
            className="absolute top-0 w-2 h-full border-x-2 border-dashed border-dc-warning/50"
            style={{ left: `${marker.position}%` }}
          />
        ))}

        <div
          className="absolute top-0 w-0.5 h-full bg-white shadow-lg"
          style={{ left: `${progress}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
        </div>
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>采样断点</span>
        <span>告警事件</span>
        <span>当前时间</span>
      </div>
    </div>
  )
}
