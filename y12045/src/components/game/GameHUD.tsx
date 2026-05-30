import { motion } from 'framer-motion';
import { Clock, Trophy, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { EXCEPTION_TYPE_LABELS } from '../../config/constants';

export function GameHUD() {
  const { time, duration, score, exceptions, packages, sortingLines } = useGameStore();

  const remainingTime = duration - time;
  const minutes = Math.floor(remainingTime / 60);
  const seconds = Math.floor(remainingTime % 60);

  const waitingUrgent = packages.filter(p => p.type === 'urgent' && p.status === 'waiting').length;
  const totalProcessed = packages.filter(p => p.status === 'completed').length;
  const totalFailed = packages.filter(p => p.status === 'failed').length;

  const recentExceptions = [...exceptions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);

  return (
    <div className="bg-[#252538] rounded-xl p-4 border border-[#3a3a52]">
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock size={16} className="text-blue-400" />
            <span className="text-xs text-gray-400">剩余时间</span>
          </div>
          <motion.div
            key={`${minutes}-${seconds}`}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-2xl font-bold font-mono ${remainingTime < 30 ? 'text-red-400' : 'text-white'}`}
          >
            {minutes}:{seconds.toString().padStart(2, '0')}
          </motion.div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy size={16} className="text-yellow-400" />
            <span className="text-xs text-gray-400">得分</span>
          </div>
          <motion.div
            key={score.total}
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`text-2xl font-bold ${score.total >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {score.total}
          </motion.div>
          <div className="text-[10px] text-gray-500 font-mono">
            +{score.base} 基础 +{score.bonus} 奖励 -{score.penalty} 扣分
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Activity size={16} className="text-green-400" />
            <span className="text-xs text-gray-400">处理统计</span>
          </div>
          <div className="text-xl font-bold text-white">
            {totalProcessed} <span className="text-gray-500">/</span> {packages.length}
          </div>
          <div className="text-[10px] font-mono">
            <span className="text-green-400">成功 {totalProcessed}</span>
            <span className="text-gray-500 mx-1">|</span>
            <span className="text-red-400">失败 {totalFailed}</span>
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-orange-400" />
            <span className="text-xs text-gray-400">待处理急件</span>
          </div>
          <motion.div
            key={waitingUrgent}
            animate={waitingUrgent > 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: waitingUrgent > 0 ? Infinity : 0, duration: 1 }}
            className={`text-2xl font-bold ${waitingUrgent > 0 ? 'text-red-400' : 'text-gray-400'}`}
          >
            {waitingUrgent}
          </motion.div>
        </div>
      </div>

      {recentExceptions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#3a3a52]">
          <p className="text-xs text-gray-400 mb-2">最近异常</p>
          <div className="space-y-1">
            {recentExceptions.map(ex => (
              <motion.div
                key={ex.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-2 text-xs bg-red-500/10 px-2 py-1.5 rounded"
              >
                <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                <span className="text-red-300">{EXCEPTION_TYPE_LABELS[ex.type]}</span>
                <span className="text-gray-500 ml-auto">
                  {Math.floor(ex.timestamp)}s
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
