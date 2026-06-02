import { motion } from 'framer-motion';
import useAppStore from '@/store/useAppStore';

const ProgressBar = () => {
  const { getStatistics } = useAppStore();
  const stats = getStatistics();

  const total = stats.total || 1;
  const checkedPercent = (stats.checked / total) * 100;
  const conflictPercent = (stats.hasConflict / total) * 100;
  const pendingPercent = (stats.pending / total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <h3 className="title-section mb-4">核对进度</h3>
      <div className="space-y-4">
        <div className="h-4 bg-midnight-700 rounded-full overflow-hidden flex">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${checkedPercent}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className="h-full bg-success-green"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${conflictPercent}%` }}
            transition={{ duration: 1, delay: 0.4 }}
            className="h-full bg-alert-red"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pendingPercent}%` }}
            transition={{ duration: 1, delay: 0.6 }}
            className="h-full bg-amber-gold-500"
          />
        </div>

        <div className="flex justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success-green" />
            <span className="text-sm text-midnight-300">已核对</span>
            <span className="text-sm font-semibold text-success-green">{stats.checked}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-alert-red" />
            <span className="text-sm text-midnight-300">有冲突</span>
            <span className="text-sm font-semibold text-alert-red">{stats.hasConflict}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-gold-500" />
            <span className="text-sm text-midnight-300">待处理</span>
            <span className="text-sm font-semibold text-amber-gold-400">{stats.pending}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-midnight-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-midnight-100">{stats.total}</p>
            <p className="text-xs text-midnight-400">总乐器数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success-green">{stats.checked}</p>
            <p className="text-xs text-midnight-400">已核对</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-alert-red">{stats.missingBox}</p>
            <p className="text-xs text-midnight-400">漏箱</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-gold-400">{stats.insuranceExpired}</p>
            <p className="text-xs text-midnight-400">保险过期</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressBar;
