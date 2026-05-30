import { useMemo } from 'react';
import type { AnomalyRecord, DetectionResult } from '@/types';
import { getAnomaliesByType } from '@/engine/detection';

export function useAnomaliesByType(anomalies: AnomalyRecord[]) {
  return useMemo(() => {
    return {
      explosion: getAnomaliesByType(anomalies, 'explosion'),
      direction_flip: getAnomaliesByType(anomalies, 'direction_flip'),
      out_of_bounds: getAnomaliesByType(anomalies, 'out_of_bounds'),
    };
  }, [anomalies]);
}

export function useDetectionSummary(anomalies: AnomalyRecord[]) {
  return useMemo(() => {
    const byType = {
      explosion: anomalies.filter((a) => a.type === 'explosion').length,
      direction_flip: anomalies.filter((a) => a.type === 'direction_flip').length,
      out_of_bounds: anomalies.filter((a) => a.type === 'out_of_bounds').length,
    };

    return {
      byType,
      total: anomalies.length,
      hasAnomalies: anomalies.length > 0,
    };
  }, [anomalies]);
}

export function useAnomalyForStreamline(
  anomalies: AnomalyRecord[],
  streamlineId: string
): AnomalyRecord | undefined {
  return useMemo(() => {
    return anomalies.find((a) => a.streamlineId === streamlineId);
  }, [anomalies, streamlineId]);
}
