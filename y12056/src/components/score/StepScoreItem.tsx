import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, BookOpen, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StepScore } from '@/types/score';
import { levels } from '@/data/levels';
import { useGameStore } from '@/store/gameStore';

interface StepScoreItemProps {
  stepScore: StepScore;
  showDetails?: boolean;
}

const errorTypeLabels: Record<string, { label: string; color: string }> = {
  missing_condition: { label: '条件缺失', color: 'bg-accent-rose/10 text-accent-rose border-accent-rose' },
  wrong_lemma: { label: '引理错用', color: 'bg-accent-amber/10 text-accent-amber border-accent-amber' },
  counterexample_not_excluded: { label: '反例未排除', color: 'bg-accent-violet/10 text-accent-violet border-accent-violet' },
};

export default function StepScoreItem({ stepScore, showDetails = false }: StepScoreItemProps) {
  const { currentLevelId } = useGameStore();
  const level = levels.find(l => l.id === currentLevelId);

  const { usedConditions, usedLemmaName } = useMemo(() => {
    if (!level) return { usedConditions: [], usedLemmaName: '' };
    const conditions = level.conditionCards
      .filter(c => stepScore.usedConditionIds.includes(c.id))
      .map(c => c.content);
    const lemma = level.lemmaCards.find(l => l.id === stepScore.usedLemmaId);
    return { usedConditions: conditions, usedLemmaName: lemma?.name || '' };
  }, [level, stepScore.usedConditionIds, stepScore.usedLemmaId]);

  const stars = useMemo(() => {
    const total = stepScore.maxPoints;
    const earned = stepScore.earnedPoints;
    const fullStars = Math.floor((earned / total) * 5);
    const emptyStars = 5 - fullStars;
    return { full: fullStars, empty: emptyStars };
  }, [stepScore.earnedPoints, stepScore.maxPoints]);

  const hasError = stepScore.errorType !== undefined;
  const errorConfig = stepScore.errorType ? errorTypeLabels[stepScore.errorType] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative rounded-xl border-2 p-4 bg-white shadow-card',
        hasError ? 'border-accent-rose' : 'border-neutral-ivory'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
              {stepScore.stepNumber}
            </span>
            <span className="font-serif text-neutral-ink text-base">{stepScore.content}</span>
          </div>

          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              {usedConditions.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-accent-amber mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-slate">
                    引用条件：
                    <span className="text-neutral-ink">{usedConditions.join('、')}</span>
                  </span>
                </div>
              )}

              {usedLemmaName && (
                <div className="flex items-start gap-2 text-sm">
                  <Lightbulb className="w-4 h-4 text-accent-emerald mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-slate">
                    使用引理：
                    <span className="text-neutral-ink">{usedLemmaName}</span>
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {errorConfig && (
            <div className="mt-3 flex items-center gap-2">
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium border',
                errorConfig.color
              )}>
                {errorConfig.label}
              </span>
            </div>
          )}

          {stepScore.deductionReason && (
            <div className="mt-2 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-accent-rose mt-0.5 flex-shrink-0" />
              <span className="text-sm text-accent-rose">{stepScore.deductionReason}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: stars.full }).map((_, i) => (
              <motion.span
                key={`full-${i}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="text-accent-amber text-lg"
              >
                ★
              </motion.span>
            ))}
            {Array.from({ length: stars.empty }).map((_, i) => (
              <motion.span
                key={`empty-${i}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 + (stars.full + i) * 0.05 }}
                className="text-neutral-slate/30 text-lg"
              >
                ☆
              </motion.span>
            ))}
          </div>
          <span className="text-sm text-neutral-slate font-medium">
            {stepScore.earnedPoints}/{stepScore.maxPoints} 分
          </span>
        </div>
      </div>
    </motion.div>
  );
}
