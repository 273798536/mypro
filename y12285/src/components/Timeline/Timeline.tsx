import { useEffect, useRef, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'
import { useStore } from '@/store/index'
import { timelineEntries } from '@/data/sampleData'

const SECTION_KEY_MAP: Record<string, string> = {
  '弦乐': 'strings',
  '木管': 'woodwinds',
  '铜管': 'brass',
  '打击乐': 'percussion',
}

function formatTime(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Timeline() {
  const timeline = useStore((s) => s.timeline)
  const setCurrentTime = useStore((s) => s.setCurrentTime)
  const togglePlay = useStore((s) => s.togglePlay)
  const toggleSection = useStore((s) => s.toggleSection)
  const activeSections = useStore((s) => s.activeSections)
  const rafRef = useRef<number>(0)
  const prevTimeRef = useRef<number>(0)

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentTime(Number(e.target.value))
    },
    [setCurrentTime],
  )

  useEffect(() => {
    if (!timeline.isPlaying) return

    prevTimeRef.current = performance.now()

    const tick = (now: number) => {
      const delta = (now - prevTimeRef.current) / 1000
      prevTimeRef.current = now

      const next = timeline.currentTime + delta
      if (next >= timeline.duration) {
        setCurrentTime(timeline.duration)
        togglePlay()
        return
      }

      for (const entry of timelineEntries) {
        const secKey = SECTION_KEY_MAP[entry.sectionName]
        if (secKey && timeline.currentTime < entry.enterTime && next >= entry.enterTime) {
          if (!activeSections.includes(secKey)) {
            toggleSection(secKey)
          }
        }
      }

      setCurrentTime(next)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [timeline.isPlaying, timeline.currentTime, timeline.duration, activeSections, setCurrentTime, togglePlay, toggleSection])

  const progress = timeline.duration > 0 ? (timeline.currentTime / timeline.duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#0a0e1a] border-t border-white/10">
      <button
        onClick={togglePlay}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/50 text-amber-400 transition-all hover:bg-amber-400/10 hover:shadow-[0_0_12px_rgba(251,191,36,0.3)]"
      >
        {timeline.isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <span className="min-w-[48px] text-sm font-mono text-white/70 text-right">
        {formatTime(timeline.currentTime)}
      </span>

      <div className="relative flex-1 mx-2">
        <input
          type="range"
          min={0}
          max={timeline.duration || 60}
          step={0.1}
          value={timeline.currentTime}
          onChange={handleSliderChange}
          className="w-full h-1.5 appearance-none bg-white/10 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(251,191,36,0.5)] [&::-webkit-slider-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgba(251,191,36,0.6) ${progress}%, rgba(255,255,255,0.1) ${progress}%)`,
          }}
        />
        <div className="absolute top-full mt-1 left-0 right-0 flex">
          {timelineEntries.map((entry) => {
            const pct = timeline.duration > 0 ? (entry.enterTime / timeline.duration) * 100 : 0
            const secKey = SECTION_KEY_MAP[entry.sectionName]
            const isActive = activeSections.includes(secKey)
            return (
              <div
                key={entry.sectionName}
                className="absolute flex flex-col items-center"
                style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
              >
                <span
                  className={`h-2 w-2 rounded-full ${isActive ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'bg-white/30'}`}
                />
                <span className="text-[10px] text-white/40 mt-0.5 whitespace-nowrap">{entry.sectionName}</span>
              </div>
            )
          })}
        </div>
      </div>

      <span className="min-w-[48px] text-sm font-mono text-white/50">
        {formatTime(timeline.duration)}
      </span>
    </div>
  )
}
