import { motion } from 'framer-motion';
import { Atom } from 'lucide-react';

export default function MeasureButton({
  onClick,
  disabled,
  isMeasuring,
}: {
  onClick: () => void;
  disabled: boolean;
  isMeasuring: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isMeasuring}
      whileHover={!disabled && !isMeasuring ? { scale: 1.05 } : {}}
      whileTap={!disabled && !isMeasuring ? { scale: 0.95 } : {}}
      className={`
        relative w-full py-3 rounded-xl font-bold text-sm tracking-wider
        transition-all duration-300 overflow-hidden
        ${disabled || isMeasuring
          ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
          : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]'
        }
      `}
    >
      {isMeasuring && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      )}
      <span className="relative flex items-center justify-center gap-2">
        <Atom className="w-4 h-4" />
        {isMeasuring ? '塌缩中...' : '执行测量'}
      </span>
    </motion.button>
  );
}
