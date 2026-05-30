import { Play, Pause, RotateCcw, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ControlBarProps {
  status: 'idle' | 'playing' | 'paused' | 'finished'
  currentBeat: number
  totalBeats: number
  totalScore: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onFinish: () => void
}

export default function ControlBar({
  status,
  currentBeat,
  totalBeats,
  totalScore,
  onStart,
  onPause,
  onResume,
  onReset,
  onFinish,
}: ControlBarProps) {
  const scoreColor =
    totalScore >= 70 ? '#00ff88' : totalScore >= 50 ? '#ffbb00' : '#ff4444'

  return (
    <div className="sticky bottom-0 bg-[#0d0d1a]/95 backdrop-blur border-t border-[#00ff88]/20 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="font-display text-sm">
          得分:{' '}
          <span style={{ color: scoreColor }}>{totalScore}</span>
        </div>

        <div className="flex items-center gap-2">
          {status === 'idle' && (
            <button
              onClick={onStart}
              className={cn(
                'rounded-lg px-4 py-2 font-display text-xs transition-all duration-200',
                'bg-[#1a1a2e] border border-[#00ff88]/40 text-[#00ff88]',
                'hover:shadow-[0_0_10px_#00ff88,0_0_20px_#00ff88] hover:scale-105'
              )}
            >
              <Play className="inline h-3.5 w-3.5 mr-1" />
              开始排练
            </button>
          )}

          {status === 'playing' && (
            <button
              onClick={onPause}
              className={cn(
                'rounded-lg px-4 py-2 font-display text-xs transition-all duration-200',
                'bg-[#1a1a2e] border border-[#ffbb00]/40 text-[#ffbb00]',
                'hover:shadow-[0_0_10px_#ffbb00,0_0_20px_#ffbb00] hover:scale-105'
              )}
            >
              <Pause className="inline h-3.5 w-3.5 mr-1" />
              暂停
            </button>
          )}

          {status === 'paused' && (
            <>
              <button
                onClick={onResume}
                className={cn(
                  'rounded-lg px-4 py-2 font-display text-xs transition-all duration-200',
                  'bg-[#1a1a2e] border border-[#ffbb00]/40 text-[#ffbb00]',
                  'hover:shadow-[0_0_10px_#ffbb00,0_0_20px_#ffbb00] hover:scale-105'
                )}
              >
                <Play className="inline h-3.5 w-3.5 mr-1" />
                继续
              </button>
              <button
                onClick={onReset}
                className={cn(
                  'rounded-lg px-4 py-2 font-display text-xs transition-all duration-200',
                  'bg-[#1a1a2e] border border-[#00ff88]/40 text-[#00ff88]',
                  'hover:shadow-[0_0_10px_#00ff88,0_0_20px_#00ff88] hover:scale-105'
                )}
              >
                <RotateCcw className="inline h-3.5 w-3.5 mr-1" />
                重开
              </button>
            </>
          )}

          {status === 'finished' && (
            <>
              <button
                onClick={onFinish}
                className={cn(
                  'rounded-lg px-4 py-2 font-display text-xs transition-all duration-200',
                  'bg-[#1a1a2e] border border-[#00bbff]/40 text-[#00bbff]',
                  'hover:shadow-[0_0_10px_#00bbff,0_0_20px_#00bbff] hover:scale-105'
                )}
              >
                <BarChart3 className="inline h-3.5 w-3.5 mr-1" />
                查看复盘
              </button>
              <button
                onClick={onReset}
                className={cn(
                  'rounded-lg px-4 py-2 font-display text-xs transition-all duration-200',
                  'bg-[#1a1a2e] border border-[#00ff88]/40 text-[#00ff88]',
                  'hover:shadow-[0_0_10px_#00ff88,0_0_20px_#00ff88] hover:scale-105'
                )}
              >
                <RotateCcw className="inline h-3.5 w-3.5 mr-1" />
                重新开始
              </button>
            </>
          )}
        </div>

        <div className="font-display text-xs text-gray-400">
          拍 {currentBeat}/{totalBeats}
        </div>
      </div>
    </div>
  )
}
