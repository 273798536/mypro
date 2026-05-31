import React, { useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Zap, Send, Target } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { canRobotAcceptOrder } from '../../utils/gameLogic';

interface DecisionPanelProps {
  onStep?: () => void;
}

const DecisionPanel: React.FC<DecisionPanelProps> = ({ onStep }) => {
  const {
    gameState,
    currentScene,
    assignOrder,
    sendToCharge,
    executeStep,
    pauseGame,
    resumeGame,
    resetGame,
    startGame,
    isPlaying,
  } = useGameStore();

  const [selectedRobotId, setSelectedRobotId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  const handleAssignOrder = () => {
    if (selectedRobotId && selectedOrderId) {
      assignOrder(selectedOrderId, selectedRobotId);
      setSelectedOrderId('');
    }
  };

  const handleSendToCharge = () => {
    if (selectedRobotId) {
      sendToCharge(selectedRobotId);
    }
  };

  const handleStep = () => {
    executeStep();
    onStep?.();
  };

  const handlePauseResume = () => {
    if (gameState?.isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
  };

  if (!gameState || !currentScene) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <p className="text-slate-400 text-center">请先选择场景并开始游戏</p>
      </div>
    );
  }

  const availableRobots = gameState.robots.filter(canRobotAcceptOrder);
  const pendingOrders = gameState.orders.filter((o) => o.status === 'pending');

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Target className="w-5 h-5 text-orange-500" />
        决策面板
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handlePauseResume}
          disabled={gameState.isGameOver}
          className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
        >
          {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {gameState.isPaused ? '继续' : '暂停'}
        </button>
        <button
          onClick={handleStep}
          disabled={gameState.isPaused || gameState.isGameOver}
          className="flex items-center justify-center gap-2 py-2 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
        >
          <SkipForward className="w-4 h-4" />
          执行一步
        </button>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">分配订单</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">选择机器人</label>
            <select
              value={selectedRobotId}
              onChange={(e) => setSelectedRobotId(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">-- 选择机器人 --</option>
              {availableRobots.map((robot) => (
                <option key={robot.id} value={robot.id}>
                  {robot.name} (电量: {robot.battery}%)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">选择订单</label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">-- 选择订单 --</option>
              {pendingOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name} - {order.goodsType} (奖励: {order.reward})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAssignOrder}
            disabled={!selectedRobotId || !selectedOrderId}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
          >
            <Send className="w-4 h-4" />
            分配订单
          </button>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">其他操作</h4>
        <button
          onClick={handleSendToCharge}
          disabled={!selectedRobotId}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
        >
          <Zap className="w-4 h-4" />
          派遣充电
        </button>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <button
          onClick={() => {
            resetGame();
            startGame();
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          重新开始
        </button>
      </div>
    </div>
  );
};

export default DecisionPanel;
