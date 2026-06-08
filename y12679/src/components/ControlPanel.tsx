import { Play, Pause, RotateCcw, Flag, History } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { useNavigate } from 'react-router-dom'

const ControlPanel = () => {
  const { gameState, startGame, pauseGame, resumeGame, resetGame, finishGame } = useGameStore()
  const navigate = useNavigate()

  const handleFinish = () => {
    finishGame()
    navigate('/result')
  }

  const handleReview = () => {
    finishGame()
    navigate('/result')
  }

  const statusConfig = {
    idle: { label: '待开始', color: 'bg-slate-400', textColor: 'text-slate-700' },
    running: { label: '运行中', color: 'bg-emerald-500 animate-pulse', textColor: 'text-emerald-700' },
    paused: { label: '已暂停', color: 'bg-amber-500', textColor: 'text-amber-700' },
    finished: { label: '已结束', color: 'bg-rose-500', textColor: 'text-rose-700' },
  }

  const status = statusConfig[gameState.status]

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${status.color}`}></span>
            <span className={`font-semibold ${status.textColor}`}>{status.label}</span>
          </div>
          <div className="text-slate-500 text-sm font-mono bg-slate-100 px-3 py-1 rounded-lg">
            ⏱ {formatTime(gameState.elapsedTime)}
          </div>
          <div className="text-slate-500 text-sm font-mono bg-slate-100 px-3 py-1 rounded-lg">
            帧 #{gameState.currentFrame}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {gameState.status === 'idle' && (
            <button
              onClick={startGame}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95 font-medium"
            >
              <Play size={18} fill="currentColor" />
              开始
            </button>
          )}

          {gameState.status === 'running' && (
            <button
              onClick={pauseGame}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-md hover:shadow-lg active:scale-95 font-medium"
            >
              <Pause size={18} fill="currentColor" />
              暂停
            </button>
          )}

          {gameState.status === 'paused' && (
            <button
              onClick={resumeGame}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95 font-medium"
            >
              <Play size={18} fill="currentColor" />
              继续
            </button>
          )}

          <button
            onClick={resetGame}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all shadow-md hover:shadow-lg active:scale-95 font-medium"
          >
            <RotateCcw size={18} />
            重开
          </button>

          {(gameState.status === 'running' || gameState.status === 'paused') && (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all shadow-md hover:shadow-lg active:scale-95 font-medium"
            >
              <Flag size={18} />
              结算
            </button>
          )}

          {gameState.status !== 'idle' && (
            <button
              onClick={handleReview}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all shadow-md hover:shadow-lg active:scale-95 font-medium"
            >
              <History size={18} />
              复盘
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ControlPanel
