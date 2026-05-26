import React, { useState, useEffect } from 'react';
import { Home, Play, Pause, SkipBack, SkipForward, Download, X } from 'lucide-react';
import { OrderBook } from '../components/game/OrderBook';
import { InventoryGauge } from '../components/game/InventoryGauge';
import { EventLog } from '../components/game/EventLog';
import { PriceChart } from '../components/game/PriceChart';
import { useGameStore } from '../store/useGameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { downloadReplay } from '../engine/replay';
import { formatTime, formatPrice } from '../utils/format';

interface ReplayPageProps {
  onGoHome: () => void;
}

export const ReplayPage: React.FC<ReplayPageProps> = ({ onGoHome }) => {
  const {
    gameState,
    replayData,
    isReplayMode,
    currentReplayIndex,
    replaySpeed,
    setReplaySpeed,
    exitReplay,
    stepReplay,
  } = useGameStore();

  const [isPlaying, setIsPlaying] = useState(false);

  useGameLoop();

  useEffect(() => {
    if (!isReplayMode || !replayData) return;

    let interval: ReturnType<typeof setInterval>;
    
    if (isPlaying) {
      interval = setInterval(() => {
        stepReplay();
      }, 100 / replaySpeed);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isReplayMode, replayData, replaySpeed, stepReplay]);

  useEffect(() => {
    if (replayData && currentReplayIndex >= replayData.snapshots.length - 1) {
      setIsPlaying(false);
    }
  }, [currentReplayIndex, replayData]);

  if (!replayData) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">没有回放数据</p>
          <button
            className="px-4 py-2 rounded-lg bg-trade-info hover:bg-trade-info/80 text-white"
            onClick={onGoHome}
          >
            返回主页
          </button>
        </div>
      </div>
    );
  }

  const progress = replayData.snapshots.length > 0
    ? (currentReplayIndex / (replayData.snapshots.length - 1)) * 100
    : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = Math.floor(
      (parseInt(e.target.value) / 100) * (replayData.snapshots.length - 1)
    );
    for (let i = currentReplayIndex; i < newIndex; i++) {
      stepReplay();
    }
  };

  const handleSkipBack = () => {
    if (currentReplayIndex > 0) {
      // 这里需要实现后退功能，暂时跳到开始
      exitReplay();
      if (replayData) {
        useGameStore.getState().loadReplay(replayData);
      }
    }
  };

  const handleSkipForward = () => {
    if (replayData && currentReplayIndex < replayData.snapshots.length - 1) {
      for (let i = 0; i < 10; i++) {
        stepReplay();
      }
    }
  };

  const handleDownload = () => {
    if (replayData) {
      downloadReplay(replayData);
    }
  };

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <header className="bg-terminal-panel border-b border-terminal-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="p-2 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              onClick={() => {
                exitReplay();
                onGoHome();
              }}
            >
              <X size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">回放模式</h1>
              <span className="text-xs text-gray-400">
                进度: {currentReplayIndex + 1} / {replayData.snapshots.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              className="bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-sm text-gray-300"
              value={replaySpeed}
              onChange={(e) => setReplaySpeed(parseFloat(e.target.value))}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
            
            <button
              className="p-2 rounded bg-terminal-panel border border-terminal-border hover:border-trade-info text-gray-300 hover:text-trade-info transition-colors"
              onClick={handleDownload}
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-4">
          <div className="col-span-3 flex flex-col gap-4">
            <OrderBook orderBook={gameState.orderBook} />
            <PriceChart priceHistory={gameState.priceHistory} />
          </div>

          <div className="col-span-5 flex flex-col gap-4">
            <div className="bg-terminal-panel rounded-lg border border-terminal-border p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">回放控制</h3>
              
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSliderChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <button
                  className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  onClick={handleSkipBack}
                >
                  <SkipBack size={20} />
                </button>
                <button
                  className="p-4 rounded-full bg-trade-up hover:bg-trade-up/80 text-white transition-colors"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <button
                  className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  onClick={handleSkipForward}
                >
                  <SkipForward size={20} />
                </button>
              </div>
            </div>

            {gameState.tradeHistory.length > 0 && (
              <div className="bg-terminal-panel rounded-lg border border-terminal-border overflow-hidden flex-1">
                <div className="px-4 py-2 border-b border-terminal-border">
                  <h3 className="text-sm font-semibold text-gray-300">成交记录</h3>
                </div>
                <div className="p-2 overflow-y-auto max-h-64">
                  <div className="space-y-1">
                    {[...gameState.tradeHistory].reverse().slice(0, 10).map((trade) => (
                      <div
                        key={trade.id}
                        className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                          trade.side === 'buy' ? 'bg-trade-up/10' : 'bg-trade-down/10'
                        }`}
                      >
                        <span className={trade.side === 'buy' ? 'text-trade-up' : 'text-trade-down'}>
                          {trade.side === 'buy' ? '买入' : '卖出'} {trade.quantity} @ {formatPrice(trade.price)}
                        </span>
                        <span className="font-mono text-gray-400">
                          手续费: {trade.fee.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-4 flex flex-col gap-4">
            <InventoryGauge
              inventory={gameState.inventory}
              avgCost={gameState.avgCost}
              currentPrice={gameState.currentPrice}
              unrealizedPnL={gameState.unrealizedPnL}
              realizedPnL={gameState.realizedPnL}
              totalFees={gameState.totalFees}
              inventoryPenalty={gameState.inventoryPenalty}
              score={gameState.score}
              cash={gameState.cash}
            />
            <div className="flex-1">
              <EventLog
                events={gameState.events}
                totalTime={gameState.totalTime}
                timeRemaining={gameState.timeRemaining}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
