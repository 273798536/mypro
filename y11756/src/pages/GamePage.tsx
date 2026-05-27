import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import IndustryCard from '../components/game/IndustryCard';
import PortfolioPanel from '../components/game/PortfolioPanel';
import RiskDashboard from '../components/game/RiskDashboard';
import TradePanel from '../components/game/TradePanel';
import NewsTimeline from '../components/game/NewsTimeline';
import NetValueChart from '../components/game/NetValueChart';
import {
  Pause,
  Play,
  RotateCcw,
  ArrowRightLeft,
  SkipForward,
  Home,
} from 'lucide-react';

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentGame,
    isTrading,
    pendingWeights,
    pendingFees,
    pendingWarnings,
    startTrading,
    cancelTrading,
    updatePendingWeight,
    confirmTrading,
    nextRound,
    pauseGame,
    resumeGame,
    restartGame,
  } = useGameStore();

  const [showPauseMenu, setShowPauseMenu] = useState(false);

  useEffect(() => {
    if (!currentGame) {
      navigate('/');
    } else if (currentGame.status === 'ended') {
      navigate(`/report/${currentGame.gameId}`);
    }
  }, [currentGame, navigate]);

  if (!currentGame) return null;

  const handlePause = () => {
    pauseGame();
    setShowPauseMenu(true);
  };

  const handleResume = () => {
    resumeGame();
    setShowPauseMenu(false);
  };

  const handleRestart = () => {
    restartGame();
    setShowPauseMenu(false);
  };

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExit}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="font-semibold">基金经理调仓赛</h1>
              <p className="text-xs text-slate-400">
                {currentGame.difficulty === 'easy' ? '简单' : currentGame.difficulty === 'normal' ? '普通' : '困难'}模式
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-slate-400">回合</p>
              <p className="font-bold font-mono text-lg">
                {currentGame.round} / {currentGame.maxRounds}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">净值</p>
              <p className={`font-bold font-mono text-lg ${currentGame.netValue >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                {(currentGame.netValue * 100).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isTrading && (
              <>
                <button
                  onClick={handlePause}
                  className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
                >
                  <Pause className="w-5 h-5" />
                </button>
                <button
                  onClick={startTrading}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 rounded-xl font-medium transition-all"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                  调仓
                </button>
                <button
                  onClick={nextRound}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 rounded-xl font-medium transition-all"
                >
                  <SkipForward className="w-5 h-5" />
                  下一回合
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full" />
                行业板块
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {currentGame.industries.map((industry) => {
                  const position = currentGame.positions.find(
                    (p) => p.industryId === industry.id
                  );
                  return (
                    <IndustryCard
                      key={industry.id}
                      industry={industry}
                      position={position}
                      onClick={() => {
                        if (!isTrading) startTrading();
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <NetValueChart
              netValueHistory={currentGame.netValueHistory}
              round={currentGame.round}
            />
          </div>

          <div className="space-y-6">
            <PortfolioPanel
              positions={currentGame.positions}
              industries={currentGame.industries}
              totalAssets={currentGame.totalAssets}
              totalFees={currentGame.totalFees}
            />

            <RiskDashboard
              riskBudget={currentGame.riskBudget}
              riskUsed={currentGame.riskUsed}
              warnings={currentGame.riskWarnings}
            />

            <NewsTimeline
              currentEvent={currentGame.currentEvent}
              eventHistory={currentGame.eventHistory}
            />
          </div>
        </div>
      </div>

      <TradePanel
        positions={currentGame.positions}
        industries={currentGame.industries}
        totalAssets={currentGame.totalAssets}
        pendingWeights={pendingWeights}
        pendingFees={pendingFees}
        pendingWarnings={pendingWarnings}
        onWeightChange={updatePendingWeight}
        onConfirm={confirmTrading}
        onCancel={cancelTrading}
      />

      {showPauseMenu && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-center mb-6">游戏暂停</h2>
            
            <div className="space-y-3">
              <button
                onClick={handleResume}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 rounded-xl font-medium transition-all"
              >
                <Play className="w-5 h-5" />
                继续游戏
              </button>
              
              <button
                onClick={handleRestart}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                重新开始
              </button>
              
              <button
                onClick={handleExit}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
              >
                <Home className="w-5 h-5" />
                返回首页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;
