import { useRef, useEffect, useCallback, useMemo } from 'react'
import { usePlaybackStore } from '@/store/usePlaybackStore'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

export default function Timeline() {
  const currentTimestamp = usePlaybackStore((s) => s.currentTimestamp)
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const playbackSpeed = usePlaybackStore((s) => s.playbackSpeed)
  const currentPracticeId = usePlaybackStore((s) => s.currentPracticeId)
  const practiceRecords = usePlaybackStore((s) => s.practiceRecords)
  const errorLabels = usePlaybackStore((s) => s.errorLabels)
  const filterConditions = usePlaybackStore((s) => s.filterConditions)
  const setCurrentTimestamp = usePlaybackStore((s) => s.setCurrentTimestamp)
  const togglePlay = usePlaybackStore((s) => s.togglePlay)
  const setPlaying = usePlaybackStore((s) => s.setPlaying)
  const setPlaybackSpeed = usePlaybackStore((s) => s.setPlaybackSpeed)

  const animRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const trackRef = useRef<HTMLDivElement>(null)

  const currentPractice = practiceRecords.find((p) => p.id === currentPracticeId)
  const duration = currentPractice?.duration ?? 60
  const progress = duration > 0 ? (currentTimestamp / duration) * 100 : 0

  const filteredErrors = useMemo(() => {
    return errorLabels.filter((e) => {
      if (e.practiceId !== currentPracticeId) return false
      if (filterConditions.errorTypes.length > 0 && !filterConditions.errorTypes.includes(e.type as 'KEYPOINT_LOSS' | 'MEASURE_MISALIGN')) return false
      return true
    })
  }, [errorLabels, currentPracticeId, filterConditions.errorTypes])

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now()
      const animate = (now: number) => {
        const delta = (now - lastTimeRef.current) / 1000
        lastTimeRef.current = now
        const store = usePlaybackStore.getState()
        const newTs = store.currentTimestamp + delta * store.playbackSpeed
        const dur = store.practiceRecords.find((p) => p.id === store.currentPracticeId)?.duration ?? 60
        if (newTs >= dur) {
          store.setPlaying(false)
          store.setCurrentTimestamp(dur)
        } else {
          store.setCurrentTimestamp(newTs)
        }
        animRef.current = requestAnimationFrame(animate)
      }
      animRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [isPlaying])

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    setCurrentTimestamp(Math.max(0, Math.min(duration, pct * duration)))
  }, [duration, setCurrentTimestamp])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full bg-[#12122a] rounded-lg p-3 border border-[#2a2a4a]">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => setCurrentTimestamp(0)}
          className="w-7 h-7 flex items-center justify-center rounded bg-[#1e1e3a] hover:bg-[#2a2a4a] text-[#8888aa] transition-colors"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={togglePlay}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#2ed573]/20 border border-[#2ed573]/40 text-[#2ed573] hover:bg-[#2ed573]/30 transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button
          onClick={() => setCurrentTimestamp(duration)}
          className="w-7 h-7 flex items-center justify-center rounded bg-[#1e1e3a] hover:bg-[#2a2a4a] text-[#8888aa] transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
        <div className="flex gap-1 ml-auto">
          {[0.5, 1, 2].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                playbackSpeed === spd
                  ? 'bg-[#2ed573]/20 text-[#2ed573] border border-[#2ed573]/40'
                  : 'bg-[#1e1e3a] text-[#6666aa] hover:bg-[#2a2a4a]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative w-full h-5 bg-[#0d0d1a] rounded cursor-pointer group"
      >
        <div
          className="absolute top-0 left-0 h-full bg-[#2ed573]/15 rounded-l transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#2ed573] rounded-full shadow-lg shadow-[#2ed573]/30 transition-all duration-75 group-hover:scale-125"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
        {filteredErrors.map((err) => {
          const errPct = (err.timestamp / duration) * 100
          const errColor = err.type === 'KEYPOINT_LOSS' ? '#ff4757' : '#ff8c00'
          return (
            <div
              key={err.id}
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                left: `calc(${errPct}% - 3px)`,
                backgroundColor: errColor,
                boxShadow: `0 0 4px ${errColor}`,
              }}
              title={`${err.type === 'KEYPOINT_LOSS' ? '关键点丢失' : '小节错位'} @ ${formatTime(err.timestamp)}`}
            />
          )
        })}
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-[#8888aa] font-mono">{formatTime(currentTimestamp)}</span>
        <span className="text-[10px] text-[#6666aa] font-mono">{formatTime(duration)}</span>
      </div>
    </div>
  )
}
