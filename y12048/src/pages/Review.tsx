import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  RotateCcw,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { GaugeMeter } from '../components/GaugeMeter';
import { PriceChart } from '../components/PriceChart';
import { cn } from '@/lib/utils';

export const Review: React.FC = () => {
  const navigate = useNavigate();
  const {
    position,
    priceHistory,
    actionHistory,
    totalRounds,
    reviewRound,
    setReviewRound,
    restartGame,
  } = useGameStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRound, setCurrentRound] = useState(reviewRound || 1);

  useEffect(() => {
    if (currentRound === 0) {
      setCurrentRound(1);
    }
  }, [currentRound]);

  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setCurrentRound((prev) => {
          if (prev >= totalRounds) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
      return () => clearInterval(timer);
    }
  }, [isPlaying, totalRounds]);

  useEffect(() => {
    setReviewRound(currentRound);
  }, [currentRound, setReviewRound]);

  const actionsInRound = actionHistory.filter((a) => a.round === currentRound);
  const priceUpToRound = priceHistory.slice(0, currentRound + 4);
  const positionAtRound = actionHistory
    .filter((a) => a.round <= currentRound)
    .slice(-1)[0]?.positionSnapshot || position;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settlement')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">复盘模式</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                <span>回合 {currentRound}/{totalRounds}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={restartGame}
              className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              再来一局
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setCurrentRound(Math.max(1, currentRound - 1))}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            disabled={currentRound <= 1}
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-4 bg-violet-500 hover:bg-violet-600 rounded-xl transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white" />
            )}
          </button>
          
          <button
            onClick={() => setCurrentRound(Math.min(totalRounds, currentRound + 1))}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            disabled={currentRound >= totalRounds}
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="w-full max-w-2xl mx-auto mb-8">
          <input
            type="range"
            min={1}
            max={totalRounds}
            value={currentRound}
            onChange={(e) => setCurrentRound(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>开始</span>
            <span>结束</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-medium text-slate-400 mb-4">仓位状态 (第{currentRound}回合)</h3>
            <div className="flex justify-center mb-4">
              <GaugeMeter
                value={positionAtRound.currentRatio}
                max={300}
                threshold={position.liquidationThreshold}
                size={180}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500 text-xs">借贷金额</div>
                <div className="text-white font-mono">${positionAtRound.borrowAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">抵押物价值</div>
                <div className="text-white font-mono">
                  ${(positionAtRound.collateralAmount * positionAtRound.collateralPrice).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">抵押物数量</div>
                <div className="text-white font-mono">
                  {positionAtRound.collateralAmount.toFixed(2)} {positionAtRound.collateralType}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">当前价格</div>
                <div className="text-white font-mono">${positionAtRound.collateralPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-medium text-slate-400 mb-4">价格走势</h3>
            <div className="h-48">
              <PriceChart
                priceHistory={priceUpToRound}
                liquidationPrice={position.liquidationPrice}
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-medium text-slate-400 mb-4">本回合操作</h3>
          <div className="space-y-3">
            {actionsInRound.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                第{currentRound}回合暂无操作记录
              </div>
            ) : (
              actionsInRound.map((action) => (
                <div
                  key={action.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    action.scoreChange >= 0
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">{action.explanation}</span>
                    <span className={cn(
                      'text-sm font-bold font-mono',
                      action.scoreChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {action.scoreChange >= 0 ? '+' : ''}{action.scoreChange} 分
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">抵押率</span>
                      <div className="text-slate-300 font-mono">{action.positionSnapshot.currentRatio.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-slate-500">价格</span>
                      <div className="text-slate-300 font-mono">${action.priceSnapshot.price.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">来源</span>
                      <div className="text-slate-300">{action.source}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">类型</span>
                      <div className="text-slate-300">{action.type}</div>
                    </div>
                  </div>
                  {action.isRevised && action.revisionNote && (
                    <div className="mt-3 p-2 bg-amber-500/10 rounded border border-amber-500/30">
                      <div className="text-xs text-amber-400 mb-1">
                        修订人: {action.revisedBy}
                      </div>
                      <div className="text-xs text-amber-200">{action.revisionNote}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
