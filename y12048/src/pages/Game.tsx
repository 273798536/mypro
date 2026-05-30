import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Home,
  Plus,
  Minus,
  DollarSign,
  Wallet,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { GaugeMeter } from '../components/GaugeMeter';
import { PriceChart } from '../components/PriceChart';
import { EventLog } from '../components/EventLog';
import { PriceJumpModal, RepeatedLiqModal, GasModal } from '../components/Modals';
import { cn } from '@/lib/utils';

export const Game: React.FC = () => {
  const navigate = useNavigate();
  const {
    status,
    currentRound,
    totalRounds,
    position,
    priceHistory,
    actionHistory,
    score,
    maxScore,
    pauseGame,
    resumeGame,
    restartGame,
    addCollateral,
    repayBorrow,
    hold,
    showPriceJumpModal,
    showRepeatedLiqModal,
    showGasModal,
  } = useGameStore();

  const [collateralAmount, setCollateralAmount] = useState(0.5);
  const [repayAmount, setRepayAmount] = useState(1000);

  useEffect(() => {
    if (status === 'idle') {
      navigate('/');
    }
  }, [status, navigate]);

  useEffect(() => {
    if (status === 'finished') {
      navigate('/settlement');
    }
  }, [status, navigate]);

  const handleAddCollateral = () => {
    if (status !== 'playing') return;
    addCollateral(collateralAmount);
  };

  const handleRepay = () => {
    if (status !== 'playing') return;
    repayBorrow(Math.min(repayAmount, position.borrowAmount));
  };

  const handleHold = () => {
    if (status !== 'playing') return;
    hold();
  };

  const getStatusColor = () => {
    switch (position.status) {
      case 'safe': return 'text-emerald-400';
      case 'warning': return 'text-yellow-400';
      case 'danger': return 'text-orange-400';
      case 'liquidated': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusBg = () => {
    switch (position.status) {
      case 'safe': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'danger': return 'bg-orange-500/10 border-orange-500/30';
      case 'liquidated': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusLabel = () => {
    switch (position.status) {
      case 'safe': return '安全';
      case 'warning': return '注意';
      case 'danger': return '危险';
      case 'liquidated': return '已清算';
      default: return '未知';
    }
  };

  const isModalOpen = showPriceJumpModal || showRepeatedLiqModal || showGasModal;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">DeFi 清算守卫</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>回合 {currentRound}/{totalRounds}</span>
                <span>·</span>
                <span className={score >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  得分: {score}/{maxScore}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status === 'playing' && (
              <button
                onClick={pauseGame}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Pause className="w-5 h-5 text-slate-400" />
              </button>
            )}
            {status === 'paused' && (
              <button
                onClick={resumeGame}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Play className="w-5 h-5 text-slate-400" />
              </button>
            )}
            <button
              onClick={restartGame}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {status === 'paused' && (
        <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pause className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">游戏暂停</h2>
            <p className="text-slate-400 mb-6">点击播放按钮继续游戏</p>
            <button
              onClick={resumeGame}
              className="px-8 py-3 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2 mx-auto"
            >
              <Play className="w-5 h-5" />
              继续游戏
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <div className={cn(
              'p-5 rounded-2xl border transition-all duration-300',
              getStatusBg(),
              position.status === 'danger' && 'animate-pulse'
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-400">仓位状态</h3>
                <span className={cn('px-2 py-1 rounded text-xs font-medium', getStatusColor())}>
                  {getStatusLabel()}
                </span>
              </div>
              <div className="flex justify-center mb-4">
                <GaugeMeter
                  value={position.currentRatio}
                  max={300}
                  threshold={position.liquidationThreshold}
                  size={180}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500 text-xs">借贷金额</div>
                  <div className="text-white font-mono">${position.borrowAmount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">抵押物价值</div>
                  <div className="text-white font-mono">
                    ${(position.collateralAmount * position.collateralPrice).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">抵押物数量</div>
                  <div className="text-white font-mono">
                    {position.collateralAmount.toFixed(2)} {position.collateralType}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">当前价格</div>
                  <div className="text-white font-mono">${position.collateralPrice.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-medium text-slate-400 mb-4">操作面板</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-2">补充抵押物</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCollateralAmount(Math.max(0.1, collateralAmount - 0.1))}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      disabled={isModalOpen || status !== 'playing'}
                    >
                      <Minus className="w-4 h-4 text-slate-400" />
                    </button>
                    <div className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-center">
                      <span className="text-white font-mono">{collateralAmount.toFixed(1)}</span>
                      <span className="text-slate-500 text-sm ml-1">{position.collateralType}</span>
                    </div>
                    <button
                      onClick={() => setCollateralAmount(collateralAmount + 0.1)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      disabled={isModalOpen || status !== 'playing'}
                    >
                      <Plus className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <button
                    onClick={handleAddCollateral}
                    disabled={isModalOpen || status !== 'playing'}
                    className="w-full mt-2 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Wallet className="w-4 h-4" />
                    补充抵押物
                  </button>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-2">偿还借贷</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRepayAmount(Math.max(100, repayAmount - 500))}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      disabled={isModalOpen || status !== 'playing'}
                    >
                      <Minus className="w-4 h-4 text-slate-400" />
                    </button>
                    <div className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-center">
                      <span className="text-white font-mono">${repayAmount.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => setRepayAmount(repayAmount + 500)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      disabled={isModalOpen || status !== 'playing'}
                    >
                      <Plus className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <button
                    onClick={handleRepay}
                    disabled={isModalOpen || status !== 'playing'}
                    className="w-full mt-2 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 text-blue-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <DollarSign className="w-4 h-4" />
                    偿还借贷
                  </button>
                </div>

                <button
                  onClick={handleHold}
                  disabled={isModalOpen || status !== 'playing'}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-5 h-5" />
                  观望，进入下一回合
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-6 space-y-6">
            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 h-80">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-400">价格走势</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span>橙色标记为异常跳变</span>
                </div>
              </div>
              <PriceChart
                priceHistory={priceHistory}
                liquidationPrice={position.liquidationPrice}
              />
            </div>

            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-medium text-slate-400 mb-4">清算公式说明</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-slate-500 text-xs mb-1">抵押率计算</div>
                  <div className="text-white font-mono text-xs">
                    (抵押物 × 价格) / 借贷 × 100%
                  </div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-slate-500 text-xs mb-1">清算价格</div>
                  <div className="text-white font-mono text-xs">
                    (借贷 × 阈值) / 抵押物
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-3">
            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 h-[540px]">
              <h3 className="text-sm font-medium text-slate-400 mb-4">操作日志 (点击查看详情)</h3>
              <EventLog actions={actionHistory} />
            </div>
          </div>
        </div>
      </main>

      <PriceJumpModal />
      <RepeatedLiqModal />
      <GasModal />
    </div>
  );
};
