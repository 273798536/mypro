import { useMemo } from 'react';
import { useResultStore } from '@/store/resultStore';

export function useGlobalAnomalyStats() {
  const { getAllAnomalies } = useResultStore();
  const anomalies = getAllAnomalies();

  const stats = useMemo(() => {
    const errorCount = anomalies.filter((a) => a.severity === 'error').length;
    const warningCount = anomalies.filter((a) => a.severity === 'warning').length;

    return {
      totalCount: anomalies.length,
      errorCount,
      warningCount,
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,
    };
  }, [anomalies]);

  return stats;
}
