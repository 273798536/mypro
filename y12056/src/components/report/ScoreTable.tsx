import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { StepScore } from '@/types/score';
import { levels } from '@/data/levels';
import { useGameStore } from '@/store/gameStore';

interface ScoreTableProps {
  stepScores: StepScore[];
}

export default function ScoreTable({ stepScores }: ScoreTableProps) {
  const { currentLevelId } = useGameStore();
  const level = levels.find(l => l.id === currentLevelId);

  const { totalEarned, totalMax } = useMemo(() => {
    const earned = stepScores.reduce((sum, s) => sum + s.earnedPoints, 0);
    const max = stepScores.reduce((sum, s) => sum + s.maxPoints, 0);
    return { totalEarned: earned, totalMax: max };
  }, [stepScores]);

  const getConditionContent = (conditionIds: string[]) => {
    if (!level) return '-';
    return level.conditionCards
      .filter(c => conditionIds.includes(c.id))
      .map(c => c.content)
      .join('、') || '-';
  };

  const getLemmaName = (lemmaId: string) => {
    if (!level) return '-';
    const lemma = level.lemmaCards.find(l => l.id === lemmaId);
    return lemma?.name || '-';
  };

  const renderStars = (earned: number, max: number) => {
    const ratio = earned / max;
    const full = Math.floor(ratio * 5);
    const empty = 5 - full;
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <span key={`f-${i}`} className="text-accent-amber">★</span>
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <span key={`e-${i}`} className="text-neutral-slate/30">☆</span>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl shadow-card border-2 border-neutral-ivory overflow-hidden"
    >
      <div className="p-6 border-b-2 border-neutral-ivory">
        <h3 className="text-lg font-bold text-neutral-ink">评分明细表</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-ivory">
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                步骤
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                内容
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                引用条件
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                使用引理
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                得分
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-slate uppercase tracking-wider">
                扣分原因
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-ivory">
            {stepScores.map((step, idx) => {
              const hasError = step.earnedPoints < step.maxPoints;
              return (
                <motion.tr
                  key={step.stepId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className={cn(
                    'transition-colors',
                    hasError ? 'bg-accent-rose/5 hover:bg-accent-rose/10' : 'hover:bg-neutral-ivory/50'
                  )}
                >
                  <td className="px-4 py-4">
                    <span className={cn(
                      'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                      hasError ? 'bg-accent-rose text-white' : 'bg-primary text-white'
                    )}>
                      {step.stepNumber}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-ink font-serif">
                    {step.content}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-slate max-w-[200px]">
                    <span className="line-clamp-2">{getConditionContent(step.usedConditionIds)}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-slate">
                    {getLemmaName(step.usedLemmaId)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center gap-1">
                      {renderStars(step.earnedPoints, step.maxPoints)}
                      <span className="text-xs text-neutral-slate">
                        {step.earnedPoints}/{step.maxPoints}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-accent-rose max-w-[200px]">
                    {step.deductionReason || '-'}
                  </td>
                </motion.tr>
              );
            })}
            <motion.tr
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-primary font-bold"
            >
              <td colSpan={4} className="px-4 py-4 text-white text-right">
                总分
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl text-white">
                    {totalEarned}/{totalMax}
                  </span>
                  <span className="text-xs text-white/70">
                    {Math.round((totalEarned / totalMax) * 100)}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-4" />
            </motion.tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
