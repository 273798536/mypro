import { useCallback, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { ErrorToleranceConfig } from '@/types';
import { calculateSchedule } from '@/utils/calculator';
import type { Question } from '@/types';

export function useScheduleCalculator() {
  const { questions, config, schedules, gaps, stats, lastCalculatedAt, runCalculation } =
    useAppStore();

  const previewWithConfig = useCallback(
    (patch: Partial<ErrorToleranceConfig>) => {
      const merged = { ...config, ...patch };
      return calculateSchedule(questions, merged);
    },
    [questions, config],
  );

  const getQuestionSchedule = useCallback(
    (qid: string) => schedules.find((s) => s.questionId === qid) || null,
    [schedules],
  );

  const batchStats = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of schedules) {
      if (s.skipped) continue;
      map.set(s.batch, (map.get(s.batch) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([batch, count]) => ({ batch, count }));
  }, [schedules]);

  return {
    schedules,
    gaps,
    stats,
    lastCalculatedAt,
    runCalculation,
    previewWithConfig,
    getQuestionSchedule,
    batchStats,
    questions: questions as Question[],
    config,
  };
}
