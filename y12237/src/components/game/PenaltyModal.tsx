import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { PenaltyEvent } from '../../game/types';
import { AlertTriangle, X, Lightbulb, Info, AlertCircle } from 'lucide-react';

interface PenaltyModalProps {
  event: PenaltyEvent | null;
  onClose: () => void;
}

const getPenaltyTypeConfig = (type: PenaltyEvent['type']) => {
  switch (type) {
    case 'offline':
      return {
        title: '⚠️ 离线惩罚触发',
        icon: AlertCircle,
        bgGradient: 'from-red-900/90 to-red-800/90',
        borderColor: 'border-red-500/50',
        accentColor: 'text-red-400',
      };
    case 'duplicate':
      return {
        title: '🔄 重复质押风险提示',
        icon: AlertTriangle,
        bgGradient: 'from-orange-900/90 to-orange-800/90',
        borderColor: 'border-orange-500/50',
        accentColor: 'text-orange-400',
      };
    case 'unlock_misclick':
      return {
        title: '⏰ 解锁误点惩罚',
        icon: Info,
        bgGradient: 'from-yellow-900/90 to-yellow-800/90',
        borderColor: 'border-yellow-500/50',
        accentColor: 'text-yellow-400',
      };
    default:
      return {
        title: '事件通知',
        icon: Info,
        bgGradient: 'from-slate-800/90 to-slate-700/90',
        borderColor: 'border-slate-500/50',
        accentColor: 'text-slate-400',
      };
  }
};

export const PenaltyModal: React.FC<PenaltyModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const config = getPenaltyTypeConfig(event.type);
  const Icon = config.icon;
  const suggestions = event.suggestion.split('\n');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-lg bg-gradient-to-br ${config.bgGradient} rounded-2xl border-2 ${config.borderColor} shadow-2xl overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X size={20} className="text-white" />
          </button>

          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0]
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`p-3 rounded-2xl bg-white/10 ${config.accentColor}`}
              >
                <Icon size={32} />
              </motion.div>
              <div>
                <h2 className={`text-xl font-bold ${config.accentColor}`}>
                  {config.title}
                </h2>
                {event.nodeName && (
                  <p className="text-white/80 text-sm">
                    涉及节点: {event.nodeName}
                  </p>
                )}
              </div>
            </div>

            {event.amount > 0 && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-6 p-4 bg-black/30 rounded-xl"
              >
                <div className="text-sm text-white/60 mb-1">惩罚金额</div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold font-mono ${config.accentColor}`}>
                    -{event.amount.toLocaleString()}
                  </span>
                  <span className="text-white/60 text-sm">枚代币</span>
                </div>
                <div className="text-xs text-white/40 mt-1">
                  第 {event.round} 回合
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <Info size={16} className={config.accentColor} />
                原因说明
              </h3>
              <div className="space-y-2">
                {event.details.map((detail, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.25 + index * 0.05 }}
                    className="flex items-start gap-2 text-sm text-white/70"
                  >
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full ${config.accentColor.replace('text', 'bg')}`} />
                    <span>{detail}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <Lightbulb size={16} className="text-yellow-400" />
                处理建议
              </h3>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.45 + index * 0.05 }}
                    className="flex items-start gap-2 text-sm text-white/70 bg-white/5 rounded-lg p-3"
                  >
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                      {index + 1}
                    </span>
                    <span>{suggestion}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="w-full mt-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-colors"
            >
              我知道了
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
