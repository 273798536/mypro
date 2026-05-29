import { useGameStore } from '@/store/gameStore';
import { Play, Pause, RotateCcw, Flag, Gauge, Timer } from 'lucide-react';

export default function ControlPanel() {
  const phase = useGameStore(s => s.state.phase);
  const tick = useGameStore(s => s.state.tick);
  const score = useGameStore(s => s.state.score);
  const maxTick = useGameStore(s => s.state.maxTick);
  const speed = useGameStore(s => s.speed);
  const start = useGameStore(s => s.start);
  const pause = useGameStore(s => s.pause);
  const resume = useGameStore(s => s.resume);
  const restart = useGameStore(s => s.restart);
  const setSpeed = useGameStore(s => s.setSpeed);

  const progress = (tick / maxTick) * 100;

  return (
    <div className="rounded-lg p-4 border border-zinc-800 bg-[#1a1a2e]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-orange-400" />
          <span className="text-white font-mono text-lg">{score}</span>
          <span className="text-zinc-500 text-xs">分</span>
        </div>
        <div className="flex items-center gap-2">
          <Timer size={12} className="text-zinc-500" />
          <span className="text-zinc-400 text-xs font-mono">
            {tick}/{maxTick}
          </span>
        </div>
      </div>

      <div className="h-1.5 bg-zinc-800 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      <div className="flex gap-2 mb-3">
        {phase === 'setup' && (
          <button
            onClick={start}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
          >
            <Play size={14} />
            开始
          </button>
        )}
        {phase === 'running' && (
          <button
            onClick={pause}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium transition-colors"
          >
            <Pause size={14} />
            暂停
          </button>
        )}
        {phase === 'paused' && (
          <button
            onClick={resume}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
          >
            <Play size={14} />
            继续
          </button>
        )}
        <button
          onClick={restart}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors"
        >
          <RotateCcw size={14} />
            重开
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">速度</span>
        {[1, 2, 3].map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
              speed === s
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
