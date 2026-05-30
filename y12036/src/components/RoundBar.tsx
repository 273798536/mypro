import { useGameStore } from '@/store/gameStore'
import { Play, Pause, RotateCcw, ChevronRight, Clock, Waves } from 'lucide-react'

export default function RoundBar() {
  const session = useGameStore(s => s.session)
  const pauseGame = useGameStore(s => s.pauseGame)
  const resumeGame = useGameStore(s => s.resumeGame)
  const restartGame = useGameStore(s => s.restartGame)
  const nextRound = useGameStore(s => s.nextRound)
  const calculateTotalDeduction = useGameStore(s => s.calculateTotalDeduction)

  const isPlaying = session.status === 'playing'
  const isFinished = session.status === 'finished'
  const deduction = calculateTotalDeduction()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-deep-sea/95 backdrop-blur border-t border-ocean-light/30">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-tide-cyan" />
            <span className="font-serif-sc font-bold text-sm text-slate-100">
              回合 {session.currentRound}/{session.totalRounds}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Waves size={14} className="text-blue-400" />
            <span className="font-sans-sc text-xs text-slate-400">
              潮汐周期 {session.tideCycle}
            </span>
          </div>

          {deduction > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-fuel-red/15 border border-fuel-red/30">
              <span className="text-[10px] font-sans-sc text-fuel-red">
                扣分 -{deduction}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isFinished ? (
            <div className="px-3 py-1.5 rounded bg-fuel-red/20 border border-fuel-red/40">
              <span className="font-sans-sc text-xs text-fuel-red font-medium">游戏结束</span>
            </div>
          ) : (
            <>
              {isPlaying ? (
                <button
                  onClick={pauseGame}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-warn-amber/15 border border-warn-amber/40 hover:bg-warn-amber/25 transition-colors"
                >
                  <Pause size={14} className="text-warn-amber" />
                  <span className="font-sans-sc text-xs text-warn-amber">暂停</span>
                </button>
              ) : (
                <button
                  onClick={resumeGame}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-tide-cyan/15 border border-tide-cyan/40 hover:bg-tide-cyan/25 transition-colors"
                >
                  <Play size={14} className="text-tide-cyan" />
                  <span className="font-sans-sc text-xs text-tide-cyan">继续</span>
                </button>
              )}

              <button
                onClick={nextRound}
                disabled={!isPlaying}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors
                  ${isPlaying
                    ? 'bg-tide-cyan/15 border-tide-cyan/40 hover:bg-tide-cyan/25 text-tide-cyan'
                    : 'bg-dock-gray/10 border-dock-gray/20 text-dock-gray cursor-not-allowed'
                  }
                `}
              >
                <ChevronRight size={14} />
                <span className="font-sans-sc text-xs">下一回合</span>
              </button>
            </>
          )}

          <button
            onClick={restartGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-dock-gray/15 border border-dock-gray/30 hover:bg-dock-gray/25 transition-colors"
          >
            <RotateCcw size={14} className="text-dock-gray" />
            <span className="font-sans-sc text-xs text-dock-gray">重开</span>
          </button>
        </div>
      </div>
    </div>
  )
}
