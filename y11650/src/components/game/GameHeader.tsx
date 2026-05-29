import { useGameStore } from '../../store/useGameStore'

export default function GameHeader() {
  const timeLeft = useGameStore(s => s.timeLeft)
  const totalTime = useGameStore(s => s.totalTime)
  const score = useGameStore(s => s.score)
  const combo = useGameStore(s => s.combo)
  const phase = useGameStore(s => s.phase)
  const pauseGame = useGameStore(s => s.pauseGame)
  const resumeGame = useGameStore(s => s.resumeGame)
  const endGame = useGameStore(s => s.endGame)

  const timePercent = (timeLeft / totalTime) * 100
  const isLowTime = timeLeft <= 10
  const isCriticalTime = timeLeft <= 5

  const comboMultiplier = combo >= 10 ? 2 : combo >= 5 ? 1.5 : 1

  return (
    <div className="bg-cafeteria-card rounded-xl shadow-lg border border-cafeteria-border p-3">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">⏱️ 剩余时间</span>
            <span className={`text-sm font-bold ${isCriticalTime ? 'text-danger animate-pulse' : isLowTime ? 'text-warning' : 'text-gray-700'}`}>
              {Math.ceil(timeLeft)}秒
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                isCriticalTime ? 'bg-danger' : isLowTime ? 'bg-warning' : 'bg-gradient-to-r from-success to-emerald-400'
              }`}
              style={{ width: `${timePercent}%` }}
            />
          </div>
        </div>

        <div className="text-center min-w-[100px]">
          <div className="text-xs text-gray-500">得分</div>
          <div className="font-display text-2xl text-primary">{score}</div>
        </div>

        <div className="text-center min-w-[80px]">
          <div className="text-xs text-gray-500">连击</div>
          <div className={`font-display text-xl ${combo >= 5 ? 'text-danger' : combo >= 3 ? 'text-warning' : 'text-gray-600'}`}>
            {combo > 0 ? `${combo}🔥` : '0'}
          </div>
          {comboMultiplier > 1 && (
            <div className="text-[10px] text-danger font-bold">{comboMultiplier}x倍率</div>
          )}
        </div>

        <div className="flex gap-2">
          {phase === 'playing' && (
            <button
              onClick={pauseGame}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              ⏸️ 暂停
            </button>
          )}
          {phase === 'paused' && (
            <>
              <button
                onClick={resumeGame}
                className="px-3 py-1.5 bg-success hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ▶️ 继续
              </button>
              <button
                onClick={endGame}
                className="px-3 py-1.5 bg-danger hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ⏹️ 结束
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
