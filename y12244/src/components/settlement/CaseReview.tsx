import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle, XCircle, AlertTriangle, Music } from 'lucide-react';
import type { Case } from '@/types';
import { VERDICT_LABELS, RISK_TYPE_LABELS, CLUE_TYPE_LABELS } from '@/types';

interface CaseReviewProps {
  cases: Case[];
}

export const CaseReview = ({ cases }: CaseReviewProps) => {
  const [expandedCase, setExpandedCase] = useState<string | null>(cases[0]?.id || null);

  const toggleCase = (caseId: string) => {
    setExpandedCase(expandedCase === caseId ? null : caseId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-panel p-6"
    >
      <h3 className="text-xl font-serif font-bold text-white mb-6 flex items-center gap-3">
        <Music className="text-accent-400" size={24} />
        案件复盘
      </h3>

      <div className="space-y-4">
        {cases.map((caseItem, index) => {
          const isExpanded = expandedCase === caseItem.id;
          const isCorrect = caseItem.userVerdict === caseItem.correctVerdict;
          const discoveredRisks = caseItem.risks.filter((r) => r.isDiscovered);
          const missedRisks = caseItem.risks.filter((r) => !r.isDiscovered);
          const assignedClues = caseItem.clues.filter((c) => c.currentCaseId === caseItem.id);

          return (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              className="bg-white/5 rounded-xl overflow-hidden border border-white/10"
            >
              <button
                onClick={() => toggleCase(caseItem.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {caseItem.isCompleted ? (
                    isCorrect ? (
                      <CheckCircle className="text-success-400 flex-shrink-0" size={24} />
                    ) : (
                      <XCircle className="text-danger-400 flex-shrink-0" size={24} />
                    )
                  ) : (
                    <AlertTriangle className="text-accent-400 flex-shrink-0" size={24} />
                  )}
                  <div className="text-left">
                    <h4 className="font-semibold text-white">{caseItem.title}</h4>
                    <p className="text-sm text-white/60">
                      {caseItem.isCompleted ? (
                        <>
                          你的判定：<span className={isCorrect ? 'text-success-400' : 'text-danger-400'}>
                            {caseItem.userVerdict ? VERDICT_LABELS[caseItem.userVerdict] : '未判定'}
                          </span>
                          {!isCorrect && caseItem.correctVerdict && (
                            <span className="text-white/40 ml-2">
                              (正确：{VERDICT_LABELS[caseItem.correctVerdict]})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-accent-400">未完成 - 扣100分</span>
                      )}
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="text-white/60" size={20} />
                </motion.div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-white/60 text-sm mb-2">人话解释</p>
                        <p className="text-white">{caseItem.humanVerdictExplanation}</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-white/60 text-sm mb-2">已收集的线索</p>
                          <div className="space-y-2">
                            {assignedClues.length > 0 ? (
                              assignedClues.map((clue) => (
                                <div
                                  key={clue.id}
                                  className="bg-white/5 rounded-lg p-3 text-sm"
                                >
                                  <p className="text-white font-medium">{clue.title}</p>
                                  <p className="text-white/50 text-xs">
                                    {CLUE_TYPE_LABELS[clue.type]}
                                    {clue.isKeyEvidence && (
                                      <span className="ml-2 text-danger-400">关键证据</span>
                                    )}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-white/40 text-sm">未收集任何线索</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {discoveredRisks.length > 0 && (
                            <div>
                              <p className="text-success-400 text-sm mb-2">✅ 已发现的风险</p>
                              <div className="space-y-2">
                                {discoveredRisks.map((risk) => (
                                  <div
                                    key={risk.id}
                                    className="bg-success-500/10 border border-success-500/30 rounded-lg p-3 text-sm"
                                  >
                                    <p className="text-success-400 font-medium">
                                      {RISK_TYPE_LABELS[risk.type]}
                                    </p>
                                    <p className="text-white/70 text-xs mt-1">{risk.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {missedRisks.length > 0 && (
                            <div>
                              <p className="text-danger-400 text-sm mb-2">⚠️ 遗漏的风险</p>
                              <div className="space-y-2">
                                {missedRisks.map((risk) => (
                                  <div
                                    key={risk.id}
                                    className="bg-danger-500/10 border border-danger-500/30 rounded-lg p-3 text-sm"
                                  >
                                    <p className="text-danger-400 font-medium">
                                      {RISK_TYPE_LABELS[risk.type]}
                                    </p>
                                    <p className="text-white/70 text-xs mt-1">{risk.description}</p>
                                    <p className="text-accent-400 text-xs mt-1">
                                      应该从「{caseItem.clues.find((c) => c.id === risk.triggerClueId)?.title || '某份材料'}」中发现
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
