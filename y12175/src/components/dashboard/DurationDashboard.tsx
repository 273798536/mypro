import { motion } from 'framer-motion';
import { Clock, Music, Mic, ArrowRightLeft, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatDuration, formatDurationLong } from '@/types';

export function DurationDashboard() {
  const { currentValidation, previousValidation, tracks } = useStore();

  if (!currentValidation || tracks.length === 0) {
    return (
      <div className="bg-indigo-900/50 rounded-xl p-8 border border-indigo-800">
        <div className="text-center text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">请先导入曲目清单和版本时长</p>
        </div>
      </div>
    );
  }

  const durationDiff = previousValidation
    ? currentValidation.totalDuration - previousValidation.totalDuration
    : null;

  const errorCount = currentValidation.errors.filter(e => e.severity === 'error').length;
  const warningCount = currentValidation.errors.filter(e => e.severity === 'warning').length;

  const statCards = [
    {
      label: '总时长',
      value: formatDuration(currentValidation.totalDuration),
      longValue: formatDurationLong(currentValidation.totalDuration),
      icon: Clock,
      color: 'text-amber-450',
      bgColor: 'bg-amber-450/10',
      diff: durationDiff
    },
    {
      label: '正场曲目',
      value: formatDuration(currentValidation.mainDuration),
      icon: Music,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      label: '返场曲目',
      value: formatDuration(currentValidation.encoreDuration),
      icon: Mic,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10'
    },
    {
      label: '换场时间',
      value: formatDuration(currentValidation.transitionDuration),
      icon: ArrowRightLeft,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-indigo-900/50 rounded-xl p-5 border border-indigo-800 hover:border-indigo-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.diff !== null && stat.diff !== 0 && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  stat.diff > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {stat.diff > 0 ? '+' : ''}{formatDuration(stat.diff)}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
            <p className={`font-mono text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
            {stat.longValue && (
              <p className="text-xs text-gray-500 mt-1">{stat.longValue}</p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="bg-indigo-900/50 rounded-xl p-5 border border-indigo-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">校验状态</h3>
          <div className="flex items-center gap-4">
            {errorCount > 0 ? (
              <div className="flex items-center gap-2 text-rose-400">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">{errorCount} 个错误</span>
              </div>
            ) : warningCount > 0 ? (
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">{warningCount} 个警告</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">全部通过</span>
              </div>
            )}
          </div>
        </div>

        <div className="w-full bg-indigo-800 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (currentValidation.mainDuration / currentValidation.totalDuration) * 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-emerald-500 float-left"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentValidation.encoreDuration / currentValidation.totalDuration) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="h-full bg-rose-500 float-left"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentValidation.transitionDuration / currentValidation.totalDuration) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            className="h-full bg-sky-500 float-left"
          />
        </div>
        <div className="flex justify-between mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
            正场 {Math.round((currentValidation.mainDuration / currentValidation.totalDuration) * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-rose-500 rounded-sm"></span>
            返场 {Math.round((currentValidation.encoreDuration / currentValidation.totalDuration) * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-sky-500 rounded-sm"></span>
            换场 {Math.round((currentValidation.transitionDuration / currentValidation.totalDuration) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
