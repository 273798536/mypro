import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { DecisionOption } from '@/types';

const DecisionCard = ({ option, disabled }: { option: DecisionOption; disabled: boolean }) => {
  const { makeDecision, resourcePoints } = useGameStore();
  const canAfford = resourcePoints >= option.effects.resourceCost;
  const isDisabled = disabled || !canAfford;

  const getEffectPreview = () => {
    const effects: string[] = [];
    if (option.effects.syncChange) {
      effects.push(`同步 ${option.effects.syncChange > 0 ? '+' : ''}${option.effects.syncChange}%`);
    }
    if (option.effects.onlineChange !== undefined) {
      effects.push(option.effects.onlineChange ? '节点上线' : '离线风险');
    }
    if (option.effects.penaltyRisk) {
      effects.push(`惩罚风险 ${option.effects.penaltyRisk}%`);
    }
    return effects;
  };

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={!isDisabled ? { y: -8, scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      onClick={() => !isDisabled && makeDecision(option.id)}
      className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
        isDisabled
          ? 'border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed'
          : 'border-cyan-500/30 bg-slate-800/60 hover:border-cyan-400 hover:bg-slate-700/60 hover:shadow-lg hover:shadow-cyan-500/20'
      }`}
    >
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-70" />
      
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          {option.title}
        </h3>
        <span className={`px-2 py-1 text-xs font-mono rounded ${
          canAfford 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          -{option.effects.resourceCost} 资源
        </span>
      </div>

      <p className="text-sm text-slate-300 mb-4 leading-relaxed">
        {option.description}
      </p>

      {getEffectPreview().length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {getEffectPreview().map((effect, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 text-xs rounded ${
                effect.includes('+') 
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : effect.includes('-') || effect.includes('风险')
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-cyan-500/15 text-cyan-400'
              }`}
            >
              {effect}
            </span>
          ))}
        </div>
      )}

      {!isDisabled && (
        <div className="flex items-center justify-end gap-1 text-cyan-400 text-sm font-medium">
          <span>选择此方案</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      )}

      {!canAfford && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 rounded-xl">
          <span className="text-red-400 text-sm font-medium flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            资源不足
          </span>
        </div>
      )}
    </motion.div>
  );
};

export const DecisionPanel = () => {
  const { currentDecisionOptions, awaitingDecision, isPlaying, isPaused } = useGameStore();
  const showPanel = awaitingDecision && isPlaying && !isPaused;

  return (
    <AnimatePresence>
      {showPanel && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-6 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pt-20"
        >
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 mb-4"
            >
              <Shield className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-amber-400 font-['Orbitron']">
                ⚔️ 回合防守决策
              </h2>
              <span className="text-sm text-slate-400 ml-auto flex items-center gap-1">
                <Clock className="w-4 h-4" />
                选择一个方案进入下一回合
              </span>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentDecisionOptions.map((option, idx) => (
                <motion.div
                  key={option.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * idx }}
                >
                  <DecisionCard option={option} disabled={false} />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
