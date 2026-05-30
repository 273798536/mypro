import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { Play, Pause, SkipBack, FastForward, Trash2 } from 'lucide-react'

export default function Timeline() {
  const history = useStore(s => s.history)
  const timelinePosition = useStore(s => s.timelinePosition)
  const isPlaying = useStore(s => s.isPlaying)
  const playbackSpeed = useStore(s => s.playbackSpeed)
  const setTimelinePosition = useStore(s => s.setTimelinePosition)
  const setIsPlaying = useStore(s => s.setIsPlaying)
  const setPlaybackSpeed = useStore(s => s.setPlaybackSpeed)
  const setParams = useStore(s => s.setParams)
  const setActiveSurface = useStore(s => s.setActiveSurface)
  const clearHistory = useStore(s => s.clearHistory)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (isPlaying && history.length > 0) {
      intervalRef.current = window.setInterval(() => {
        const pos = useStore.getState().timelinePosition
        const nextPos = pos + 1
        if (nextPos >= history.length) {
          setIsPlaying(false)
          return
        }
        const entry = history[nextPos]
        if (entry) {
          setActiveSurface(entry.surfaceId)
          setParams({ ...entry.params })
          setTimelinePosition(nextPos)
        }
      }, 1000 / playbackSpeed)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, playbackSpeed, history])

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = parseInt(e.target.value)
    setTimelinePosition(pos)
    if (history[pos]) {
      const entry = history[pos]
      setActiveSurface(entry.surfaceId)
      setParams({ ...entry.params })
    }
  }, [history])

  return (
    <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#e8e6e1] tracking-wide uppercase">时间轴</h2>
        <span className="text-[10px] font-mono text-[#e8e6e1]/40">
          {history.length > 0 ? `${timelinePosition + 1} / ${history.length}` : '暂无记录'}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={0}
          max={Math.max(0, history.length - 1)}
          value={timelinePosition}
          onChange={handleSliderChange}
          disabled={history.length === 0}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer
            bg-white/[0.08] accent-[#d4a853]
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[#d4a853]
            [&::-webkit-slider-thumb]:cursor-pointer
            disabled:opacity-30"
        />
        {history.length > 0 && (
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-mono text-[#e8e6e1]/25">
              {new Date(history[0].timestamp).toLocaleTimeString()}
            </span>
            <span className="text-[9px] font-mono text-[#e8e6e1]/25">
              {new Date(history[history.length - 1].timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setTimelinePosition(0)
            if (history[0]) {
              setActiveSurface(history[0].surfaceId)
              setParams({ ...history[0].params })
            }
          }}
          disabled={history.length === 0}
          className="p-1.5 rounded-md border border-white/[0.06] text-[#e8e6e1]/50
            hover:text-[#e8e6e1]/80 hover:bg-white/[0.04] transition-all disabled:opacity-30"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={history.length === 0}
          className="p-2 rounded-md border border-[#d4a853]/30 text-[#d4a853]
            hover:bg-[#d4a853]/10 transition-all disabled:opacity-30"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1)}
          className="text-[10px] font-mono px-2 py-1 rounded-md border border-white/[0.06]
            text-[#e8e6e1]/50 hover:text-[#e8e6e1]/80 hover:bg-white/[0.04] transition-all"
        >
          <FastForward className="w-3 h-3 inline mr-1" />
          {playbackSpeed}x
        </button>

        <div className="flex-1" />

        <button
          onClick={clearHistory}
          disabled={history.length === 0}
          className="p-1.5 rounded-md border border-white/[0.06] text-[#e8e6e1]/30
            hover:text-red-400 hover:border-red-400/20 transition-all disabled:opacity-30"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
