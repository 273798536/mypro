import { useNavigate } from 'react-router-dom';
import { RotateCcw, BarChart3, SkipForward, Trophy, AlertCircle } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TimePeriodToggle } from './TimePeriodToggle';

export function GameHeader() {
  const navigate = useNavigate();
  const { currentTurn, maxTurns, score, isGameOver, gameResult, resetGame, nextTurn } = useGameStore();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleGoToReview = () => {
    navigate('/review');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800">🔊 声音污染调度员</h1>
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
              环保科普
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">回合</p>
            <p className="text-lg font-bold text-gray-800">
              {currentTurn} / {maxTurns}
            </p>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">评分</p>
            <p className={`text-lg font-bold ${getScoreColor(score)}`}>
              {score}
            </p>
          </div>

          <TimePeriodToggle />

          <div className="flex items-center gap-2">
            <button
              onClick={resetGame}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline">重置</span>
            </button>

            {isGameOver ? (
              <button
                onClick={handleGoToReview}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <BarChart3 size={16} />
                <span>查看复盘</span>
              </button>
            ) : (
              <button
                onClick={nextTurn}
                className="flex items-center gap-2 px-4 py-2 bg-eco-600 text-white rounded-lg hover:bg-eco-700 transition-colors"
              >
                <SkipForward size={16} />
                <span>下一回合</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isGameOver && (
        <div className={`mt-4 p-4 rounded-xl flex items-center justify-between ${
          gameResult === 'win'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {gameResult === 'win' ? (
              <Trophy className="text-green-600" size={24} />
            ) : (
              <AlertCircle className="text-red-600" size={24} />
            )}
            <div>
              <h3 className={`font-bold ${
                gameResult === 'win' ? 'text-green-800' : 'text-red-800'
              }`}>
                {gameResult === 'win' ? '🎉 游戏胜利！' : '😢 游戏结束'}
              </h3>
              <p className={`text-sm ${
                gameResult === 'win' ? 'text-green-600' : 'text-red-600'
              }`}>
                {gameResult === 'win'
                  ? '恭喜！你成功维持了城市声环境质量'
                  : '很遗憾，居民满意度或评分过低了'}
              </p>
            </div>
          </div>
          <button
            onClick={handleGoToReview}
            className={`px-4 py-2 rounded-lg font-medium ${
              gameResult === 'win'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            查看详细分析 →
          </button>
        </div>
      )}
    </div>
  );
}
