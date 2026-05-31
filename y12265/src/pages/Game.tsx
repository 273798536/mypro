import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import WarehouseGrid from '../components/game/WarehouseGrid';
import DecisionPanel from '../components/game/DecisionPanel';
import StatusPanel from '../components/game/StatusPanel';
import GameResultModal from '../components/game/GameResultModal';

const Game: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentScene,
    gameState,
    gameResult,
    startGame,
    isPlaying,
    currentStep,
  } = useGameStore();

  const [showResult, setShowResult] = useState(false);
  const [showSourceInfo, setShowSourceInfo] = useState<string | null>(null);

  useEffect(() => {
    if (gameResult) {
      setShowResult(true);
    }
  }, [gameResult]);

  if (!currentScene) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">请先选择场景</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">{currentScene.name}</h1>
              <p className="text-xs text-slate-400">
                {currentScene.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSourceInfo(currentScene.source)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs transition-colors"
            >
              <Info className="w-3 h-3" />
              来源
            </button>
          </div>
        </div>
      </header>

      {!isPlaying && !gameState ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">准备开始</h2>
              <p className="text-slate-400">点击下方按钮开始游戏</p>
            </div>
            <button
              onClick={startGame}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl text-white font-bold text-lg transition-all transform hover:scale-105"
            >
              <Play className="w-6 h-6" />
              开始游戏
            </button>
          </div>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <StatusPanel />
            </div>
            <div className="lg:col-span-2">
              <WarehouseGrid
                scene={currentScene}
                gameState={gameState}
              />
              {gameState?.isPaused && (
                <div className="mt-4 bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 text-center">
                  <p className="text-yellow-500 font-bold">游戏已暂停</p>
                  <p className="text-yellow-400/70 text-sm">暂停时间将影响最终得分</p>
                </div>
              )}
            </div>
            <div className="lg:col-span-1">
              <DecisionPanel />
            </div>
          </div>

          <div className="mt-6 bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-bold text-slate-300 mb-3">订单列表</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gameState?.orders.map((order) => (
                <div
                  key={order.id}
                  className={`p-3 rounded-lg border ${
                    order.status === 'completed'
                      ? 'bg-green-900/30 border-green-600'
                      : order.status === 'timeout'
                      ? 'bg-red-900/30 border-red-600'
                      : order.status === 'assigned'
                      ? 'bg-blue-900/30 border-blue-600'
                      : 'bg-slate-700/50 border-slate-600'
                  }`}
                >
                  <div className="font-bold text-white text-sm mb-1">{order.name}</div>
                  <div className="text-xs text-slate-400 mb-2">{order.goodsType}</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">奖励</span>
                    <span className="text-orange-400">+{order.reward}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-500">截止</span>
                    <span className={gameState && gameState.currentTime >= order.deadline - 10 ? 'text-red-400' : 'text-slate-400'}>
                      {order.deadline}步
                    </span>
                  </div>
                  <div className="mt-2 text-xs">
                    {order.status === 'completed' && <span className="text-green-400">✓ 已完成</span>}
                    {order.status === 'timeout' && <span className="text-red-400">✗ 已超时</span>}
                    {order.status === 'assigned' && <span className="text-blue-400">⏳ 配送中</span>}
                    {order.status === 'pending' && <span className="text-slate-400">○ 等待分配</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {showResult && <GameResultModal onClose={() => setShowResult(false)} />}

      {showSourceInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSourceInfo(null)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">来源信息</h3>
            <p className="text-slate-300">{showSourceInfo}</p>
            <button
              onClick={() => setShowSourceInfo(null)}
              className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
