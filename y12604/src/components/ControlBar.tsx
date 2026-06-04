import { Play, Pause, RotateCcw, Undo2, Redo2, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/gameStore'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ControlBar() {
  const phase = useGameStore((s) => s.phase)
  const round = useGameStore((s) => s.round)
  const elapsedTime = useGameStore((s) => s.elapsedTime)
  const undoStack = useGameStore((s) => s.undoStack)
  const redoStack = useGameStore((s) => s.redoStack)
  const start = useGameStore((s) => s.start)
  const pause = useGameStore((s) => s.pause)
  const resume = useGameStore((s) => s.resume)
  const restart = useGameStore((s) => s.restart)
  const finish = useGameStore((s) => s.finish)
  const undo = useGameStore((s) => s.undo)
  const redo = useGameStore((s) => s.redo)
  const seedSampleData = useGameStore((s) => s.seedSampleData)

  const showFinish = phase === 'running' || phase === 'paused'

  return (
    <div className="flex h-12 items-center justify-between bg-[#2D3748] px-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">手绘地图比例尺校对</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
          第{round}轮
        </span>
      </div>

      <div className="flex items-center gap-2">
        {phase === 'idle' && (
          <button
            onClick={start}
            className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
          >
            <Play size={14} />
            开始
          </button>
        )}
        {phase === 'running' && (
          <button
            onClick={pause}
            className="flex items-center gap-1 rounded bg-amber-500 px-3 py-1 text-sm text-white hover:bg-amber-600"
          >
            <Pause size={14} />
            暂停
          </button>
        )}
        {phase === 'paused' && (
          <button
            onClick={resume}
            className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
          >
            <Play size={14} />
            继续
          </button>
        )}
        <button
          onClick={restart}
          className="flex items-center gap-1 rounded bg-gray-500 px-3 py-1 text-sm text-white hover:bg-gray-600"
        >
          <RotateCcw size={14} />
          重开
        </button>
        {phase === 'idle' && (
          <button
            onClick={seedSampleData}
            className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
          >
            <FlaskConical size={14} />
            加载示例
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-white" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          {formatTime(elapsedTime)}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className={cn(
              'rounded p-1 text-white',
              undoStack.length === 0
                ? 'cursor-not-allowed opacity-40'
                : 'hover:bg-white/10'
            )}
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className={cn(
              'rounded p-1 text-white',
              redoStack.length === 0
                ? 'cursor-not-allowed opacity-40'
                : 'hover:bg-white/10'
            )}
          >
            <Redo2 size={16} />
          </button>
        </div>

        {showFinish && (
          <button
            onClick={finish}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
          >
            完成校对
          </button>
        )}
      </div>
    </div>
  )
}
