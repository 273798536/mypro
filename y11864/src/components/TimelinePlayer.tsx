import { useEffect, useRef } from 'react'
import { useSimStore } from '@/store/useSimStore'
import { Play, Pause, RotateCcw } from 'lucide-react'

export default function TimelinePlayer() {
  const isPlaying = useSimStore(s => s.isPlaying)
  const setIsPlaying = useSimStore(s => s.setIsPlaying)
  const timelinePos = useSimStore(s => s.timelinePosition)
  const setTimelinePos = useSimStore(s => s.setTimelinePosition)
  const trajectories = useSimStore(s => s.trajectories)
  const activeId = useSimStore(s => s.activeTrajectoryId)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const activeTraj = trajectories.find(t => t.id === activeId)
  const maxTime = activeTraj ? activeTraj.flightTime : trajectories.length > 0 ? Math.max(...trajectories.map(t => t.flightTime)) : 10

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current)
      return
    }
    lastTimeRef.current = performance.now()
    const tick = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now
      const next = timelinePos + dt
      if (next >= maxTime) {
        setIsPlaying(false)
        setTimelinePos(maxTime)
        return
      }
      setTimelinePos(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, maxTime, timelinePos, setIsPlaying, setTimelinePos])

  const handleReset = () => {
    setIsPlaying(false)
    setTimelinePos(0)
  }

  const activeAtTime = activeTraj?.points.find(p => p.t >= timelinePos)

  return (
    <div className="h-[72px] bg-[#0d1117] border-t border-[#1e2a3a] flex items-center px-4 gap-4">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-8 h-8 rounded-full bg-[#00d4ff] hover:bg-[#00b8e0] text-[#0a0e17] flex items-center justify-center transition-colors"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        onClick={handleReset}
        className="w-8 h-8 rounded-full bg-[#1a1f2e] hover:bg-[#2a3040] text-[#8892a4] flex items-center justify-center transition-colors"
      >
        <RotateCcw size={12} />
      </button>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-xs font-mono text-[#8892a4] w-14">{timelinePos.toFixed(2)}s</span>
        <input
          type="range"
          min={0}
          max={maxTime}
          step={0.01}
          value={timelinePos}
          onChange={e => setTimelinePos(parseFloat(e.target.value))}
          className="flex-1 accent-[#00d4ff] h-1"
        />
        <span className="text-xs font-mono text-[#8892a4] w-14 text-right">{maxTime.toFixed(2)}s</span>
      </div>

      {activeAtTime && (
        <div className="flex items-center gap-4 text-[10px] font-mono text-[#8892a4]">
          <span>x: <span className="text-[#c8d0dc]">{activeAtTime.x.toFixed(1)}</span></span>
          <span>y: <span className="text-[#c8d0dc]">{activeAtTime.y.toFixed(1)}</span></span>
          <span>v: <span className="text-[#c8d0dc]">{Math.sqrt(activeAtTime.vx ** 2 + activeAtTime.vy ** 2).toFixed(1)}</span></span>
        </div>
      )}
    </div>
  )
}
