import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { RISK_TYPE_LABELS, RISK_TYPE_COLORS } from '@/types';

export const RiskPanel = () => {
  const discoveredRisks = useGameStore((state) => state.discoveredRisks);
  const cases = useGameStore((state) => state.cases);

  const getTriggerClueTitle = (clueId: string) => {
    for (const caseItem of cases) {
      const clue = caseItem.clues.find((c) => c.id === clueId);
      if (clue) return clue.title;
    }
    return '未知材料';
  };

  const getCaseTitle = (caseId: string) => {
    return cases.find((c) => c.id === caseId)?.title || '未知案件';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-danger-500/20 rounded-lg">
          <AlertTriangle className="text-danger-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">风险预警</h2>
          <p className="text-sm text-white/60">
            已发现 {discoveredRisks.length} 个风险点
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        <AnimatePresence>
          {discoveredRisks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-48 text-white/40 text-center p-4"
            >
              <Clock size={40} className="mb-3 opacity-50" />
              <p className="text-sm">尚未发现风险点</p>
              <p className="text-xs mt-1">正确关联线索后系统将自动识别风险</p>
            </motion.div>
          ) : (
            discoveredRisks.map((risk, index) => (
              <motion.div
                key={risk.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="glass-panel p-4 border-l-4"
                style={{ borderLeftColor: RISK_TYPE_COLORS[risk.type] }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: RISK_TYPE_COLORS[risk.type] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${RISK_TYPE_COLORS[risk.type]}20`,
                          color: RISK_TYPE_COLORS[risk.type],
                        }}
                      >
                        {RISK_TYPE_LABELS[risk.type]}
                      </span>
                      <span className="text-xs text-white/50">
                        {getCaseTitle(risk.caseId)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-white text-sm mb-2">
                      {risk.title}
                    </h4>
                    <p className="text-xs text-white/70 mb-2">{risk.description}</p>
                    <div className="bg-white/5 rounded-lg p-2 text-xs">
                      <p className="text-white/60 mb-1">
                        📄 触发材料：
                        <span className="text-accent-400 ml-1">
                          {getTriggerClueTitle(risk.triggerClueId)}
                        </span>
                      </p>
                      <p className="text-white/60 flex items-start gap-1">
                        <ArrowRight size={12} className="mt-0.5 flex-shrink-0 text-success-400" />
                        <span>
                          <span className="text-success-400">下一步：</span>
                          {risk.nextStep}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {discoveredRisks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-accent-500/20 rounded-lg border border-accent-500/30"
        >
          <p className="text-xs text-accent-300">
            💡 提示：风险点已自动标记在对应案件中，做出判定时请充分考虑这些风险因素。
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};
