import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Home, Trophy } from 'lucide-react';
import Timeline from '../components/Timeline';
import BondCard from '../components/BondCard';
import CashFlowGrid from '../components/CashFlowGrid';
import OperationTraces from '../components/OperationTraces';
import EventModal from '../components/EventModal';
import { useGameStore, useCurrentLevel } from '../store/gameStore';

const Game: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const startLevel = useGameStore(state => state.startLevel);
  const score = useGameStore(state => state.score);
  const isGameOver = useGameStore(state => state.isGameOver);
  const resetGame = useGameStore(state => state.resetGame);
  const level = useCurrentLevel();

  useEffect(() => {
    if (levelId) {
      startLevel(levelId);
    }
    return () => {
      resetGame();
    };
  }, [levelId, startLevel, resetGame]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoReview = () => {
    navigate(`/review/${levelId}`);
  };

  if (!level) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">关卡不存在</p>
          <button
            onClick={handleGoHome}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">返回</span>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-800">{level.name}</h1>
                <p className="text-xs text-gray-500">{level.bondCard.name} - {level.bondCard.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-lg">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-amber-700">{score} 分</span>
              </div>
              {isGameOver && (
                <button
                  onClick={handleGoReview}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <BarChart3 className="w-5 h-5" />
                  查看复盘
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {isGameOver && (
          <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">🎉 游戏结束！</h2>
                <p className="text-white/90">
                  最终得分：<span className="font-bold text-3xl">{score}</span> 分
                  {score >= level.targetScore ? (
                    <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                      ✓ 恭喜通过！
                    </span>
                  ) : (
                    <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                      目标：{level.targetScore}分
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => startLevel(levelId || '')}
                  className="px-6 py-3 bg-white text-amber-600 rounded-lg font-semibold hover:bg-white/90 transition-colors"
                >
                  再玩一次
                </button>
                <button
                  onClick={handleGoReview}
                  className="px-6 py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-colors"
                >
                  查看复盘
                </button>
              </div>
            </div>
          </div>
        )}

        <Timeline />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <BondCard />
            <CashFlowGrid />
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-20 h-[calc(100vh-6rem)]">
              <OperationTraces />
            </div>
          </div>
        </div>
      </main>

      <EventModal />
    </div>
  );
};

export default Game;
