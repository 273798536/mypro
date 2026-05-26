import React, { useState, useEffect } from 'react';
import { Pause, Play, RotateCcw, Home, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { OrderBook } from '../components/game/OrderBook';
import { QuotePanel } from '../components/game/QuotePanel';
import { InventoryGauge } from '../components/game/InventoryGauge';
import { EventLog } from '../components/game/EventLog';
import { PriceChart } from '../components/game/PriceChart';
import { useGameStore } from '../store/useGameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { DIFFICULTY_CONFIGS } from '../engine/config';
import { formatTime, formatPrice } from '../utils/format';

interface GamePageProps {
  onGoHome: () => void;
  onShowSettlement: () => void;
}

export const GamePage: React.FC<GamePageProps> = ({ onGoHome, onShowSettlement }) => {
  const {
    gameState,
    pauseGame,
    resumeGame,
    restartGame,
    placeOrder,
    cancelOrder,
    endGame,
    settlementReport,
  } = useGameStore();

  const [selectedPrice, setSelectedPrice] = useState<number>();
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  useGameLoop();

  useEffect(() => {
    if (gameState.status === 'ended' && settlementReport) {
      onShowSettlement();
    }
  }, [gameState.status, settlementReport, onShowSettlement]);

  const handlePriceClick = (price: number, side: 'buy' | 'sell') => {
    setSelectedPrice(price);
  };

  const handlePlaceOrder = (side: 'buy' | 'sell', price: number, quantity: number) => {
    return placeOrder(side, price, quantity);
  };

  const handleEndGame = () => {
    endGame('manual');
    setShowEndConfirm(false);
  };

  const config = DIFFICULTY_CONFIGS[gameState.difficulty];
  const timePercent = (gameState.timeRemaining / gameState.totalTime) * 100;
  const isLowTime = gameState.timeRemaining < 30;

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <header className="bg-terminal-panel border-b border-terminal-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="p-2 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              onClick={() => setShowPauseMenu(true)}
            >
              <Home size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">做市商价差挑战</h1>
              <span className="text-xs text-gray-400">{config.name}难度</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock size={16} className={isLowTime ? 'text-trade-down animate-pulse' : 'text-gray-400'} />
              <div className="w-32">
                <div className="h-2 bg-terminal-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isLowTime ? 'bg-trade-down' : 'bg-trade-info'
                    }`}
                    style={{ width: `${timePercent}%` }}
                  />
                </div>
                <div className={`text-xs text-center mt-1 font-mono ${isLowTime ? 'text-trade-down' : 'text-gray-400'}`}>
                  {formatTime(gameState.timeRemaining)}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500">当前价格</div>
              <div className="text-xl font-bold font-mono text-white">
                {formatPrice(gameState.currentPrice)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {gameState.status === 'playing' ? (
                <button
                  className="p-2 rounded bg-trade-warn/20 text-trade-warn hover:bg-trade-warn/30 transition-colors"
                  onClick={pauseGame}
                >
                  <Pause size={18} />
                </button>
              ) : gameState.status === 'paused' ? (
                <button
                  className="p-2 rounded bg-trade-up/20 text-trade-up hover:bg-trade-up/30 transition-colors"
                  onClick={resumeGame}
                >
                  <Play size={18} />
                </button>
              ) : null}
              <button
                className="p-2 rounded bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white transition-colors"
                onClick={restartGame}
              >
                <RotateCcw size={18} />
              </button>
              <button
                className="px-3 py-2 rounded bg-trade-down/20 text-trade-down hover:bg-trade-down/30 text-sm font-medium transition-colors"
                onClick={() => setShowEndConfirm(true)}
              >
                结算
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-4">
          <div className="col-span-3 flex flex-col gap-4">
            <OrderBook
              orderBook={gameState.orderBook}
              onPriceClick={handlePriceClick}
              selectedPrice={selectedPrice}
            />
            <PriceChart priceHistory={gameState.priceHistory} />
          </div>

          <div className="col-span-5 flex flex-col gap-4">
            <QuotePanel
              currentPrice={gameState.currentPrice}
              activeOrders={gameState.activeOrders}
              onPlaceOrder={handlePlaceOrder}
              onCancelOrder={cancelOrder}
              disabled={gameState.status !== 'playing'}
            />
            
            {gameState.tradeHistory.length > 0 && (
              <div className="bg-terminal-panel rounded-lg border border-terminal-border overflow-hidden flex-1">
                <div className="px-4 py-2 border-b border-terminal-border">
                  <h3 className="text-sm font-semibold text-gray-300">最近成交</h3>
                </div>
                <div className="p-2 overflow-y-auto max-h-48">
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

      {showPauseMenu && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-terminal-panel rounded-xl border border-terminal-border p-6 w-80">
            <h2 className="text-xl font-bold text-white mb-4 text-center">游戏暂停</h2>
            <div className="space-y-3">
              <button
                className="w-full py-3 rounded-lg bg-trade-up hover:bg-trade-up/80 text-white font-semibold transition-colors"
                onClick={() => {
                  resumeGame();
                  setShowPauseMenu(false);
                }}
              >
                继续游戏
              </button>
              <button
                className="w-full py-3 rounded-lg bg-trade-info hover:bg-trade-info/80 text-white font-semibold transition-colors"
                onClick={() => {
                  restartGame();
                  setShowPauseMenu(false);
                }}
              >
                重新开始
              </button>
              <button
                className="w-full py-3 rounded-lg bg-terminal-bg hover:bg-gray-700 text-gray-300 font-semibold transition-colors border border-terminal-border"
                onClick={onGoHome}
              >
                返回主页
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-terminal-panel rounded-xl border border-terminal-border p-6 w-96">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-trade-warn/20 flex items-center justify-center">
                <AlertTriangle className="text-trade-warn" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">确认结算？</h2>
                <p className="text-sm text-gray-400">提前结束游戏并查看结算报告</p>
              </div>
            </div>
            
            <div className="bg-terminal-bg rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">当前得分</span>
                <span className={`font-mono font-bold ${gameState.score >= 0 ? 'text-trade-up' : 'text-trade-down'}`}>
                  {gameState.score.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">剩余时间</span>
                <span className="font-mono text-white">{formatTime(gameState.timeRemaining)}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-lg bg-terminal-bg hover:bg-gray-700 text-gray-300 font-semibold transition-colors border border-terminal-border"
                onClick={() => setShowEndConfirm(false)}
              >
                取消
              </button>
              <button
                className="flex-1 py-3 rounded-lg bg-trade-down hover:bg-trade-down/80 text-white font-semibold transition-colors"
                onClick={handleEndGame}
              >
                确认结算
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
