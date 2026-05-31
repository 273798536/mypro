import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { FolderOpen, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import type { Case } from '@/types';
import { CLUE_TYPE_LABELS, RISK_TYPE_COLORS } from '@/types';
import { VerdictButtons } from './VerdictButtons';
import { useGameStore } from '@/store/useGameStore';

interface CaseCardProps {
  caseItem: Case;
  index: number;
}

export const CaseCard = ({ caseItem, index }: CaseCardProps) => {
  const [showDetail, setShowDetail] = useState(false);
  const { isOver, setNodeRef } = useDroppable({
    id: caseItem.id,
  });
  const unassignClue = useGameStore((state) => state.unassignClue);

  const assignedClues = caseItem.clues.filter((c) => c.currentCaseId === caseItem.id);
  const discoveredRisks = caseItem.risks.filter((r) => r.isDiscovered);

  const hasAllTypes = caseItem.requiredClueTypes.every((type) =>
    assignedClues.some((c) => c.type === type)
  );
  const hasEnoughClues = assignedClues.length >= caseItem.requiredClueCount;
  const isReady = hasAllTypes && hasEnoughClues;

  const getBorderStyle = () => {
    if (caseItem.isCompleted) {
      return caseItem.userVerdict === caseItem.correctVerdict
        ? 'border-success-500 bg-success-500/10'
        : 'border-danger-500 bg-danger-500/10';
    }
    if (isOver) return 'border-accent-400 bg-accent-500/20';
    if (isReady) return 'border-accent-500 bg-accent-500/10';
    return 'border-white/30 bg-white/5';
  };

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
      className={`glass-panel p-5 transition-all duration-300 border-2 ${getBorderStyle()}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <FolderOpen className="text-accent-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-white">
              {caseItem.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {caseItem.requiredClueTypes.map((type) => {
                const hasType = assignedClues.some((c) => c.type === type);
                return (
                  <span
                    key={type}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      hasType
                        ? 'bg-success-500/30 text-success-300'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {CLUE_TYPE_LABELS[type]}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        {caseItem.isCompleted && (
          <CheckCircle2
            className={caseItem.userVerdict === caseItem.correctVerdict ? 'text-success-400' : 'text-danger-400'}
            size={24}
          />
        )}
      </div>

      <p className="text-sm text-white/70 mb-4">{caseItem.description}</p>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">
            已收集 {assignedClues.length} / {caseItem.requiredClueCount} 份材料
          </span>
          {isReady && !caseItem.isCompleted && (
            <span className="text-xs text-accent-400 font-medium">✓ 证据充足</span>
          )}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: caseItem.requiredClueCount }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < assignedClues.length ? 'bg-accent-400' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {assignedClues.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 mb-4 overflow-hidden"
          >
            {assignedClues.map((clue) => (
              <motion.div
                key={clue.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white/10 rounded-lg p-3 flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{clue.title}</p>
                  <p className="text-xs text-white/50">{CLUE_TYPE_LABELS[clue.type]}</p>
                </div>
                {!caseItem.isCompleted && (
                  <button
                    onClick={() => unassignClue(clue.id)}
                    className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity"
                  >
                    <X size={14} className="text-white/60" />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {discoveredRisks.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-white/60 flex items-center gap-1">
            <AlertTriangle size={12} className="text-danger-400" />
            已发现风险：
          </p>
          {discoveredRisks.map((risk) => (
            <motion.div
              key={risk.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="risk-item text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: RISK_TYPE_COLORS[risk.type] }}
                />
                <span className="font-medium text-white">{risk.title}</span>
              </div>
              <button
                onClick={() => setShowDetail(!showDetail)}
                className="text-xs text-white/60 hover:text-white/80 mt-1"
              >
                {showDetail ? '收起详情' : '查看详情'}
              </button>
              {showDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-2 text-xs text-white/70 space-y-1"
                >
                  <p>{risk.description}</p>
                  <p className="text-accent-400">📌 下一步：{risk.nextStep}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <VerdictButtons caseItem={caseItem} />
    </motion.div>
  );
};
