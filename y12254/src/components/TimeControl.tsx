import type { SimulationSpeed, GamePhase } from '@/types'
import { Play, Pause, SkipForward, RotateCcw, Gauge } from 'lucide-react'

interface Props {
  phase: GamePhase
  speed: SimulationSpeed
  tick: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onStep: () => void
  onSpeedChange: (s: SimulationSpeed) => void
}

export default function TimeControl({
  phase, speed, tick,
  onStart, onPause, onResume, onReset, onStep, onSpeedChange,
}: Props) {
  const playBtn = phase === 'running'
    ? <button onClick={onPause} className="btn-secondary flex items-center gap-1"><Pause size={14} /> 暂停</button>
    : phase === 'paused'
      ? <button onClick={onResume} className="btn-primary flex items-center gap-1"><Play size={14} /> 继续</button>
      : <button onClick={onStart} className="btn-primary flex items-center gap-1"><Play size={14} /> 开始</button>

  const speeds: SimulationSpeed[] = [1, 2, 4]

  return (
    <div className="bg-milk-50 border-t border-milk-200 px-4 py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {playBtn}
          <button
            onClick={onStep}
            disabled={phase === 'running'}
            className="btn-secondary flex items-center gap-1 disabled:opacity-40"
          >
            <SkipForward size={14} /> 步进
          </button>
          <button onClick={onReset} className="btn-secondary flex items-center gap-1">
            <RotateCcw size={14} /> 重置
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Gauge size={14} className="text-milk-400" />
            {speeds.map(s => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-0.5 text-xs rounded-full transition-all ${
                  speed === s
                    ? 'bg-milk-400 text-white'
                    : 'bg-milk-100 text-milk-600 hover:bg-milk-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="font-mono text-milk-700 font-bold bg-white px-3 py-1 rounded-lg border border-milk-200">
            T = {tick}
          </div>
        </div>
      </div>
    </div>
  )
}
