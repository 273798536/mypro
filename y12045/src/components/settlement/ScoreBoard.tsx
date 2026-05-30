import { motion } from 'framer-motion';
import { Trophy, Award, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { PACKAGE_TYPE_LABELS } from '../../config/constants';

export function ScoreBoard() {
  const { score, packages, exceptions, config, duration, queueStrategy, pathStrategy } = useGameStore();

  const totalPackages = packages.length;
  const completedPackages = packages.filter(p => p.status === 'completed').length;
  const failedPackages = packages.filter(p => p.status === 'failed').length;
  const successRate = totalPackages > 0 ? (completedPackages / totalPackages * 100).toFixed(1) : '0';

  const byType = {
    normal: packages.filter(p => p.type === 'normal' && p.status === 'completed').length,
    urgent: packages.filter(p => p.type === 'urgent' && p.status === 'completed').length,
    damaged: packages.filter(p => p.type === 'damaged' && p.status === 'completed').length,
  };

  const exceptionCounts = exceptions.reduce((acc, ex) => {
    acc[ex.type] = (acc[ex.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalPenalty = exceptions.reduce((sum, ex) => sum + ex.penalty, 0);

  const getGrade = () => {
    const maxScore = totalPackages * 15;
    const percentage = maxScore > 0 ? score.total / maxScore : 0;
    if (percentage >= 0.8) return { grade: 'S', color: '#FFD700', label: '优秀' };
    if (percentage >= 0.6) return { grade: 'A', color: '#00B42A', label: '良好' };
    if (percentage >= 0.4) return { grade: 'B', color: '#165DFF', label: '及格' };
    if (percentage >= 0.2) return { grade: 'C', color: '#FF7D00', label: '待改进' };
    return { grade: 'D', color: '#F53F3F', label: '需要练习' };
  };

  const gradeInfo = getGrade();

  return (
    <div className="bg-[#252538] rounded-xl p-6 border border-[#3a3a52]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-yellow-400" size={28} />
            游戏结算
          </h2>
          <p className="text-gray-400 text-sm mt-1">时长 {duration}s · {queueStrategy.toUpperCase()} · {pathStrategy}</p>
        </div>
        
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="text-center"
        >
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold"
            style={{ 
              backgroundColor: `${gradeInfo.color}20`,
              color: gradeInfo.color,
              border: `3px solid ${gradeInfo.color}`,
            }}
          >
            {gradeInfo.grade}
          </div>
          <p className="text-xs mt-1" style={{ color: gradeInfo.color }}>{gradeInfo.label}</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-4 gap-4 mb-6"
      >
        <div className="bg-[#1a1a2e] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400 mb-1">+{score.base}</div>
          <div className="text-xs text-gray-400">基础分</div>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-400 mb-1">+{score.bonus}</div>
          <div className="text-xs text-gray-400">奖励分</div>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-400 mb-1">-{score.penalty}</div>
          <div className="text-xs text-gray-400">扣罚分</div>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-4 text-center">
          <div className={`text-3xl font-bold mb-1 ${score.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {score.total}
          </div>
          <div className="text-xs text-gray-400">总分</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-4 mb-6"
      >
        <div className="bg-[#1a1a2e] rounded-xl p-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Package size={16} className="text-blue-400" />
            处理统计
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">总包裹数</span>
              <span className="text-white font-bold">{totalPackages}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <CheckCircle size={12} className="text-green-400" />
                成功处理
              </span>
              <span className="text-green-400 font-bold">{completedPackages}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <XCircle size={12} className="text-red-400" />
                处理失败
              </span>
              <span className="text-red-400 font-bold">{failedPackages}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <TrendingUp size={12} className="text-blue-400" />
                成功率
              </span>
              <span className={`font-bold ${parseFloat(successRate) >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                {successRate}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a2e] rounded-xl p-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Award size={16} className="text-yellow-400" />
            按类型统计
          </h3>
          <div className="space-y-2">
            {Object.entries(byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{PACKAGE_TYPE_LABELS[type]}</span>
                <span className="text-white font-bold">{count} 件</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {exceptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
        >
          <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
            <AlertTriangle size={16} />
            异常扣分明细
          </h3>
          <div className="space-y-2">
            {Object.entries(exceptionCounts).map(([type, count]) => {
              const penalty = exceptions.find(e => e.type === type)?.penalty || 0;
              return (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    {type === 'urgent_starvation' ? '急件饥饿' : 
                     type === 'line_congestion' ? '路线堵塞' :
                     type === 'damaged_failure' ? '破损件处理失败' : '超时未送达'}
                    <span className="text-gray-500 ml-1">× {count}</span>
                  </span>
                  <span className="text-red-400 font-bold">-{penalty * count}</span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-red-500/20 flex items-center justify-between font-bold">
              <span className="text-gray-300">合计扣分</span>
              <span className="text-red-400">-{totalPenalty}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
