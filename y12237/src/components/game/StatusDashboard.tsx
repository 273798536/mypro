import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { Wallet, Coins, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';

export const StatusDashboard: React.FC = () => {
  const totalBalance = useGameStore((state) => state.totalBalance);
  const initialBalance = useGameStore((state) => state.initialBalance);
  const totalReward = useGameStore((state) => state.totalReward);
  const totalPenalty = useGameStore((state) => state.totalPenalty);
  const isGameStarted = useGameStore((state) => state.isGameStarted);
  const getTotalStaked = useGameStore((state) => state.getTotalStaked);
  const penaltyEvents = useGameStore((state) => state.penaltyEvents);
  const operationLog = useGameStore((state) => state.operationLog);

  const totalStaked = getTotalStaked();
  const availableBalance = totalBalance;
  const returnRate = isGameStarted
    ? ((totalBalance + totalStaked - initialBalance) / initialBalance) * 100
    : 0;

  const offlinePenalties = penaltyEvents.filter((p) => p.type === 'offline');
  const recentLogs = operationLog.slice(-8).reverse();

  if (!isGameStarted) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl p-4 border border-cyan-500/30"
        >
          <div className="flex items-center gap-2 text-cyan-400 text-xs mb-1">
            <Wallet size={14} />
            总资产
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {(totalBalance + totalStaked).toLocaleString()}
          </div>
          <div
            className={`text-xs flex items-center gap-1 mt-1 ${
              returnRate >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {returnRate >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {returnRate >= 0 ? '+' : ''}
            {returnRate.toFixed(2)}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30"
        >
          <div className="flex items-center gap-2 text-purple-400 text-xs mb-1">
            <Coins size={14} />
            可用余额
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {availableBalance.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            质押中: {totalStaked.toLocaleString()}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30"
        >
          <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
            <TrendingUp size={14} />
            累计奖励
          </div>
          <div className="text-2xl font-bold text-green-400 font-mono">
            +{totalReward.toLocaleString()}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl p-4 border border-red-500/30"
        >
          <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
            <TrendingDown size={14} />
            累计惩罚
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            -{totalPenalty.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            离线 {offlinePenalties.length} 次
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-800/80 rounded-xl p-4 border border-slate-700"
      >
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <Activity size={16} className="text-cyan-400" />
          操作日志
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentLogs.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-4">
              暂无操作记录
            </div>
          ) : (
            recentLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                  log.type === 'penalty'
                    ? 'bg-red-500/10'
                    : log.type === 'reward'
                    ? 'bg-green-500/10'
                    : 'bg-slate-900/50'
                }`}
              >
                <span className="text-slate-500 text-xs font-mono whitespace-nowrap">
                  R{log.round}
                </span>
                <span
                  className={`${
                    log.type === 'penalty'
                      ? 'text-red-400'
                      : log.type === 'reward'
                      ? 'text-green-400'
                      : 'text-slate-300'
                  }`}
                >
                  {log.description}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {offlinePenalties.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-red-500/10 rounded-xl p-4 border border-red-500/30"
        >
          <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} />
            风险事件记录
          </h3>
          <div className="space-y-2">
            {offlinePenalties.slice(-3).map((penalty) => (
              <div
                key={penalty.id}
                className="text-sm text-slate-300 flex items-center justify-between"
              >
                <span className="text-slate-400">第{penalty.round}回合 · {penalty.nodeName}</span>
                <span className="text-red-400 font-mono">-{penalty.amount}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
