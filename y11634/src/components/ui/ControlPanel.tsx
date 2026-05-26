import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/useGameStore'
import { Play, Pause, RotateCcw, FileText } from 'lucide-react'

const ControlPanel = () => {
  const navigate = useNavigate()
  const { status, startGame, pauseGame, resumeGame, resetGame } = useGameStore()

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
      <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
        <span className="text-xl">🎮</span>
        控制面板
      </h3>

      <div className="space-y-3">
        {status === 'idle' && (
          <button
          onClick={startGame}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
        >
          <Play className="w-5 h-5" />
          开始游戏
        </button>
      )}

        {status === 'playing' && (
          <button
            onClick={pauseGame}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-yellow-500/30"
          >
            <Pause className="w-5 h-5" />
            暂停
          </button>
        )}

        {status === 'paused' && (
          <button
            onClick={resumeGame}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-green-500/30"
          >
            <Play className="w-5 h-5" />
            继续
          </button>
        )}

        {status === 'ended' && (
          <>
            <button
              onClick={() => navigate('/report')}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-purple-500/30"
            >
              <FileText className="w-5 h-5" />
              查看报告
            </button>
            <button
              onClick={resetGame}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/30"
            >
              <RotateCcw className="w-5 h-5" />
              重新开始
            </button>
          </>
        )}

        {(status === 'playing' || status === 'paused') && (
          <button
            onClick={resetGame}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
          >
            <RotateCcw className="w-5 h-5" />
            重置
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <h4 className="text-sm font-semibold text-slate-400 mb-2">游戏说明</h4>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• 点击岔口(⚙)切换轨道方向</li>
          <li>• 将矿石从矿场运送到仓库</li>
          <li>• 避免矿车碰撞</li>
          <li>• 注意能量消耗</li>
          <li>• 小心陨石撞击</li>
        </ul>
      </div>
    </div>
  )
}

export default ControlPanel
