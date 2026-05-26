import { Trophy, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import type { GameStatus, Order, Anomaly } from '../../types';
import { formatTime } from '../../utils/scoring';

interface StatusBarProps {
  status: GameStatus;
  totalScore: number;
  elapsedTime: number;
  orders: Order[];
  anomalies: Anomaly[];
}

export function StatusBar({ status, totalScore, elapsedTime, orders, anomalies }: StatusBarProps) {
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'assigned').length;

  const statusConfig = {
    ready: { label: '准备开始', color: 'bg-blue-500' },
    playing: { label: '游戏进行中', color: 'bg-green-500' },
    paused: { label: '已暂停', color: 'bg-yellow-500' },
    finished: { label: '游戏结束', color: 'bg-purple-500' },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="bg-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${currentStatus.color}`}>
            {currentStatus.label}
          </div>
          <div className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-lg">{totalScore}</span>
            <span className="text-slate-400 text-sm">分</span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="font-mono">{formatTime(elapsedTime)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm">
              已完成: <span className="font-bold">{completedOrders}</span>/{totalOrders}
            </span>
          </div>
          {pendingOrders > 0 && (
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">待处理: {pendingOrders}</span>
            </div>
          )}
          {anomalies.length > 0 && (
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">异常: {anomalies.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
