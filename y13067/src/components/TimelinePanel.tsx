import { useStore } from '@/store/useStore'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

export default function TimelinePanel() {
  const currentFrame = useStore((s) => s.currentFrame)
  const totalFrames = useStore((s) => s.totalFrames)
  const setCurrentFrame = useStore((s) => s.setCurrentFrame)
  const collisions = useStore((s) => s.collisions)

  const collisionFrames = new Set(collisions.filter(c => c.status === 'collision').map(c => c.frameIndex))

  return (
    <div className="bg-zinc-900/80 border-t border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentFrame(0)}
            className="p-1.5 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}
            className="p-1.5 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Pause size={14} />
          </button>
          <button
            onClick={() => setCurrentFrame(Math.min(totalFrames - 1, currentFrame + 1))}
            className="p-1.5 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Play size={14} />
          </button>
          <button
            onClick={() => setCurrentFrame(totalFrames - 1)}
            className="p-1.5 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <SkipForward size={14} />
          </button>
        </div>

        <div className="flex-1 relative">
          <div className="relative h-6 flex items-center">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-zinc-800 rounded-full" />
            {Array.from({ length: totalFrames }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentFrame(i)}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                style={{ left: `${(i / (totalFrames - 1)) * 100}%` }}
              >
                <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentFrame
                    ? 'bg-amber-400 scale-125 ring-2 ring-amber-400/30'
                    : collisionFrames.has(i)
                      ? 'bg-red-500 hover:scale-110'
                      : 'bg-zinc-600 hover:bg-zinc-500'
                }`} />
              </button>
            ))}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 bg-amber-400/60 rounded-full transition-all"
              style={{ width: `${(currentFrame / (totalFrames - 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-zinc-400 min-w-[60px] text-right font-mono">
          帧 {currentFrame}/{totalFrames - 1}
        </div>
      </div>

      <div className="flex justify-between mt-1 px-[2px]">
        {Array.from({ length: totalFrames }, (_, i) => (
          <span key={i} className={`text-[8px] ${i === currentFrame ? 'text-amber-400' : 'text-zinc-700'}`}>
            F{i}
          </span>
        ))}
      </div>
    </div>
  )
}
