import React from 'react';
import { Clock, Trophy, Package, Bot, AlertTriangle, Info } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

const StatusPanel: React.FC = () => {
  const { gameState, currentScene, currentStep, pauseRecords } = useGameStore();

  if (!gameState || !currentScene) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <p className="text-slate-400 text-center">游戏未开始</p>
      </div>
    );
  }

  const totalPauseTime = pauseRecords.reduce((sum, pr) => sum + (pr.duration || 0), 0);
  const completedOrders = gameState.orders.filter((o) => o.status === 'completed');
  const pendingOrders = gameState.orders.filter((o) => o.status === 'pending' || o.status === 'assigned');
  const timeoutOrders = gameState.orders.filter((o) => o.status === 'timeout');

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Info className="w-5 h-5 text-blue-500" />
        游戏状态
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Clock className="w-3 h-3" />
            时间
          </div>
          <div className="text-white font-bold">
            {gameState.currentTime} / {gameState.maxTime}
          </div>
        </div>
        <div className="bg-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Trophy className="w-3 h-3" />
            得分
          </div>
          <div className="text-white font-bold">{gameState.score}</div>
        </div>
      </div>

      <div className="bg-slate-700 rounded-lg p-3">
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
          <Package className="w-3 h-3" />
          订单状态
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">已完成</span>
            <span className="text-green-500 font-bold">{completedOrders.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">进行中</span>
            <span className="text-blue-500 font-bold">{pendingOrders.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">已超时</span>
            <span className="text-red-500 font-bold">{timeoutOrders.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-700 rounded-lg p-3">
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
          <Bot className="w-3 h-3" />
          机器人状态
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {gameState.robots.map((robot) => (
            <div key={robot.id} className="flex justify-between items-center text-sm">
              <span className="text-white">{robot.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      robot.battery > 30 ? 'bg-green-500' : robot.battery > 10 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${robot.battery}%` }}
                  />
                </div>
                <span className="text-slate-400 text-xs w-8">{robot.battery}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalPauseTime > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-500 text-xs mb-1">
            <AlertTriangle className="w-3 h-3" />
            暂停记录
          </div>
          <div className="text-yellow-400 text-sm">
            总暂停时长: {totalPauseTime} 秒
            <span className="text-yellow-600 text-xs ml-2">
              (扣除 {Math.floor(totalPauseTime * 0.5)} 分)
            </span>
          </div>
        </div>
      )}

      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
        <span className="text-slate-400 text-xs">步骤: </span>
        <span className="text-white font-bold">{currentStep}</span>
      </div>
    </div>
  );
};

export default StatusPanel;
