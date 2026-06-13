import type { DeflectionRecord, Statistics } from '@/types';

export function computeStatistics(records: DeflectionRecord[]): Statistics {
  return {
    totalCount: records.length,
    passCount: records.filter((r) => r.status === 'PASS').length,
    noiseCount: records.filter((r) => r.status === 'NOISE_SUSPECTED').length,
    extremeCount: records.filter((r) => r.status === 'EXTREME_VALUE').length,
    pendingCount: records.filter((r) => r.status === 'PENDING_CONFIRM').length,
    confirmedCount: records.filter(
      (r) => r.status === 'CONFIRMED_PASS' || r.status === 'CONFIRMED_REJECT'
    ).length,
  };
}
