import { Database, CheckCircle, AlertTriangle, AlertOctagon, Clock, UserCheck } from 'lucide-react';
import { useUnifiedDataSource } from '@/hooks/useUnifiedDataSource';
import AnimatedNumber from '@/components/common/AnimatedNumber';
import { motion } from 'framer-motion';

const statConfigs = [
  { key: 'totalCount', label: '总检测数', icon: Database, color: 'text-white', bg: 'bg-[#5a9fd4]/10', border: 'border-[#5a9fd4]/30' },
  { key: 'passCount', label: '正常通过', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  { key: 'noiseCount', label: '疑似噪声', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { key: 'extremeCount', label: '极端值', icon: AlertOctagon, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  { key: 'pendingCount', label: '待人工确认', icon: Clock, color: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
  { key: 'confirmedCount', label: '已确认', icon: UserCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function StatsOverview() {
  const { statistics, isLoading } = useUnifiedDataSource();

  if (isLoading || !statistics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-4 animate-pulse">
            <div className="h-4 w-16 bg-[#2d5a8e] mb-3 rounded" />
            <div className="h-8 w-12 bg-[#2d5a8e] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
    >
      {statConfigs.map((config) => {
        const Icon = config.icon;
        const value = statistics[config.key as keyof typeof statistics] ?? 0;
        const isAnomaly = config.key === 'noiseCount' || config.key === 'extremeCount' || config.key === 'pendingCount';

        return (
          <motion.div
            key={config.key}
            variants={itemVariants}
            className={`${config.bg} ${config.border} border-2 p-4 relative overflow-hidden`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-[#8ba7c7] text-xs font-medium mb-2">{config.label}</p>
                <div className={`text-2xl font-bold font-mono ${config.color} ${isAnomaly && value > 0 ? 'animate-pulse' : ''}`}>
                  <AnimatedNumber value={value} />
                </div>
              </div>
              <div className={`w-10 h-10 ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
            </div>
            {isAnomaly && value > 0 && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-400" />
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
