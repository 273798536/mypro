import type { SimulationSnapshot, GameEvent } from '@/types'
import { useState, useRef, useEffect } from 'react'

interface Props {
  snapshots: SimulationSnapshot[]
  onSeek: (tick: number) => void
}

export default function ReplayPlayer({ snapshots, onSeek }: Props) {
  const [currentTick, setCurrentTick] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxTick = snapshots.length > 0 ? snapshots[snapshots.length - 1].tick : 0

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTick(prev => {
          if (prev >= maxTick) {
            setIsPlaying(false)
            return prev
          }
          onSeek(prev + 1)
          return prev + 1
        })
      }, 500)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, maxTick, onSeek])

  const keyEvents = snapshots.reduce<GameEvent[]>((acc, snap) => {
    const abnormal = snap.events.filter(e =>
      ['no_show', 'window_disabled', 'abnormal_duration'].includes(e.type)
    )
    return [...acc, ...abnormal]
  }, [])

  return (
    <div className="card">
      <h3 className="font-bold text-milk-700 text-sm mb-3">⏪ 回放控制器</h3>

      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="btn-primary text-xs flex items-center gap-1"
        >
          {isPlaying ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <span className="font-mono text-milk-600 text-xs">
          T = {currentTick} / {maxTick}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={0}
          max={maxTick}
          value={currentTick}
          onChange={e => {
            const t = Number(e.target.value)
            setCurrentTick(t)
            onSeek(t)
          }}
          className="w-full h-2 bg-milk-200 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-milk-400 [&::-webkit-slider-thumb]:shadow-md"
        />

        <div className="flex justify-between mt-1">
          {keyEvents.slice(0, 8).map((e, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentTick(e.tick)
                onSeek(e.tick)
              }}
              className="w-2 h-2 rounded-full bg-anomaly hover:bg-anomaly/70 transition-colors"
              title={`T${e.tick}: ${e.detail}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
