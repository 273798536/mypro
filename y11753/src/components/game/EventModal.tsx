import { motion } from 'framer-motion';
import { Info, X, AlertCircle, Zap, Cloud } from 'lucide-react';
import { GameEvent } from '../../types';

const eventIcons: Record<string, typeof Info> = {
  weather_change: Cloud,
  battery_warning: Zap,
  fault_missed: AlertCircle,
  info: Info,
  operation: Info
};

const eventStyles: Record<string, { bg: string; border: string; icon: string; title: string }> = {
  info: {
    bg: 'bg-slate-800',
    border: 'border-slate-600',
    icon: 'text-cyan-400',
    title: 'text-white'
  },
  warning: {
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-600',
    icon: 'text-yellow-400',
    title: 'text-yellow-300'
  },
  danger: {
    bg: 'bg-red-900/30',
    border: 'border-red-600',
    icon: 'text-red-400',
    title: 'text-red-300'
  }
};

interface EventModalProps {
  event: GameEvent;
  onClose: () => void;
}

export const EventModal = ({ event, onClose }: EventModalProps) => {
  const Icon = eventIcons[event.type] || Info;
  const style = eventStyles[event.level] || eventStyles.info;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`${style.bg} ${style.border} border-2 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${style.icon} bg-white/10`}>
            <Icon className="w-8 h-8" />
          </div>
          
          <div className="flex-1">
            <h3 className={`text-xl font-bold ${style.title} mb-2`}>
              {event.title}
            </h3>
            <p className="text-slate-300 leading-relaxed">
              {event.message}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
          >
            我知道了
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
