import { motion } from 'framer-motion';

interface SyncProgressBarProps {
  progress: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SyncProgressBar = ({ progress, showLabel = true, size = 'md' }: SyncProgressBarProps) => {
  const getColor = () => {
    if (progress >= 80) return 'from-emerald-500 to-cyan-400';
    if (progress >= 50) return 'from-amber-500 to-orange-400';
    return 'from-red-500 to-rose-400';
  };

  const heightClass = size === 'sm' ? 'h-2' : size === 'lg' ? 'h-4' : 'h-3';

  return (
    <div className="w-full">
      <div className={`w-full bg-slate-700/50 rounded-full overflow-hidden ${heightClass} relative`}>
        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
        </div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${getColor()} rounded-full relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[dataFlow_1.5s_infinite]" />
        </motion.div>
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-slate-400">同步进度</span>
          <span className={`font-mono font-bold ${progress >= 80 ? 'text-emerald-400' : progress >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {progress}%
          </span>
        </div>
      )}
    </div>
  );
};
