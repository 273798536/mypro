import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Shield, Play, Clock, Trophy, Star, History } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { Level } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { levels, histories, loadData, resumeGame } = useGameStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDifficultyColor = (difficulty: Level['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: Level['difficulty']) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return '未知';
    }
  };

  const getBestScore = (levelId: string) => {
    const levelHistories = histories.filter(h => h.levelId === levelId);
    if (levelHistories.length === 0) return null;
    return Math.max(...levelHistories.map(h => h.finalScore));
  };

  const handleStartGame = (levelId: string) => {
    const hasResume = resumeGame();
    if (hasResume) {
      if (confirm('检测到未完成的游戏，是否继续？')) {
        navigate('/game/' + levelId);
      } else {
        useGameStore.getState().resetGame();
        useGameStore.getState().startGame(levelId);
        navigate('/game/' + levelId);
      }
    } else {
      useGameStore.getState().startGame(levelId);
      navigate('/game/' + levelId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Shield size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">化学品仓库配伍赛</h1>
                <p className="text-sm text-gray-400">危化品安全培训互动游戏</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <History size={18} />
              历史记录
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-2xl p-8 mb-8 border border-blue-800">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Package size={40} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">欢迎参加危化品仓储安全培训</h2>
              <p className="text-gray-300 mb-4">
                通过模拟危化品仓储摆放场景，学习并掌握危化品安全管理知识。
                在游戏中，您需要将化学品正确摆放到货架上，避免禁忌相邻、温度超限、距离不足等安全风险。
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-400" />
                  <span>{levels.length} 个关卡</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-yellow-400" />
                  <span>{histories.length} 次完成</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Play size={20} className="text-green-400" />
          选择关卡
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {levels.map(level => {
            const bestScore = getBestScore(level.id);
            
            return (
              <div
                key={level.id}
                className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-500 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-lg">{level.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs text-white ${getDifficultyColor(level.difficulty)}`}>
                        {getDifficultyLabel(level.difficulty)}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {Math.floor(level.timeLimit / 60)} 分钟
                      </span>
                    </div>
                  </div>
                  {bestScore !== null && (
                    <div className="text-right">
                      <div className="text-xs text-gray-400">最佳成绩</div>
                      <div className="text-xl font-bold text-yellow-400">{bestScore}</div>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-400 mb-4">{level.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>目标分数: {level.targetScore}</span>
                  <span>需摆放: {level.requiredPlacements} 件化学品</span>
                </div>

                <button
                  onClick={() => handleStartGame(level.id)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-blue-500/20"
                >
                  <Play size={16} />
                  开始挑战
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="font-bold text-lg mb-4">游戏规则说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 font-bold">1</span>
              </div>
              <div>
                <div className="font-medium">禁忌相邻</div>
                <div className="text-gray-400">不相容的化学品不能相邻存放</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-orange-400 font-bold">2</span>
              </div>
              <div>
                <div className="font-medium">温度超限</div>
                <div className="text-gray-400">化学品需在允许温度范围内存放</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-yellow-400 font-bold">3</span>
              </div>
              <div>
                <div className="font-medium">距离不足</div>
                <div className="text-gray-400">高危化学品需要足够的隔离距离</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
