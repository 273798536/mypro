import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, BookOpen, Lightbulb, Hexagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoreResult } from '@/types/score';

interface ScoreSummaryProps {
  scoreResult: ScoreResult;
}

export default function ScoreSummary({ scoreResult }: ScoreSummaryProps) {
  const { percentage, correctSteps, wrongSteps, errorStats } = useMemo(() => {
    const percentage = Math.round((scoreResult.totalPoints / scoreResult.maxPoints) * 100);
    const correctSteps = scoreResult.stepScores.filter(s => s.earnedPoints === s.maxPoints).length;
    const wrongSteps = scoreResult.stepScores.filter(s => s.earnedPoints < s.maxPoints).length;
    
    const errorStats = {
      missing_condition: scoreResult.missingConditions.length,
      wrong_lemma: scoreResult.wrongLemmas.length,
      counterexample_not_excluded: scoreResult.unexcludedCounterexamples.length,
    };

    return { percentage, correctSteps, wrongSteps, errorStats };
  }, [scoreResult]);

  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getProgressColor = () => {
    if (percentage >= 80) return 'text-accent-emerald';
    if (percentage >= 60) return 'text-accent-amber';
    return 'text-accent-rose';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl shadow-card p-6 border-2 border-neutral-ivory"
    >
      <h3 className="text-lg font-bold text-neutral-ink mb-6">评分汇总</h3>

      <div className="flex items-center gap-8">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r="60"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            <motion.circle
              cx="70"
              cy="70"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              className={cn(getProgressColor())}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className={cn('text-3xl font-bold', getProgressColor())}
            >
              {percentage}%
            </motion.span>
            <span className="text-xs text-neutral-slate">得分率</span>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-neutral-ink">{scoreResult.totalPoints}</span>
              <span className="text-lg text-neutral-slate">/ {scoreResult.maxPoints} 分</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-accent-emerald/5"
            >
              <CheckCircle2 className="w-5 h-5 text-accent-emerald" />
              <div>
                <div className="text-lg font-bold text-accent-emerald">{correctSteps}</div>
                <div className="text-xs text-neutral-slate">正确步骤</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-accent-rose/5"
            >
              <XCircle className="w-5 h-5 text-accent-rose" />
              <div>
                <div className="text-lg font-bold text-accent-rose">{wrongSteps}</div>
                <div className="text-xs text-neutral-slate">错误步骤</div>
              </div>
            </motion.div>
          </div>

          <div className="pt-2 space-y-2">
            {errorStats.missing_condition > 0 && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 text-sm"
              >
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-neutral-slate">条件缺失：</span>
                <span className="text-primary font-medium">{errorStats.missing_condition} 处</span>
              </motion.div>
            )}
            {errorStats.wrong_lemma > 0 && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-2 text-sm"
              >
                <Lightbulb className="w-4 h-4 text-accent-amber" />
                <span className="text-neutral-slate">引理错用：</span>
                <span className="text-accent-amber font-medium">{errorStats.wrong_lemma} 处</span>
              </motion.div>
            )}
            {errorStats.counterexample_not_excluded > 0 && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center gap-2 text-sm"
              >
                <Hexagon className="w-4 h-4 text-accent-violet" />
                <span className="text-neutral-slate">反例未排除：</span>
                <span className="text-accent-violet font-medium">{errorStats.counterexample_not_excluded} 处</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
