import { useMemo } from 'react';
import type { Point2D } from '@/types';
import {
  analyzePath,
  getAnomalyTypeLabel,
  getSeverityLabel,
  getSeverityColor,
  filterAnomaliesBySeverity,
  groupAnomaliesByType,
  type PathAnalysis,
} from '@/utils/math/anomalyDetection';

export function useAnomalyDetection(
  nodes: Point2D[],
  stepSize: number,
  resultId: string
) {
  const analysis = useMemo<PathAnalysis>(() => {
    return analyzePath(nodes, stepSize, resultId);
  }, [nodes, stepSize, resultId]);

  const errorCount = useMemo(
    () => analysis.anomalies.filter((a) => a.severity === 'error').length,
    [analysis.anomalies]
  );

  const warningCount = useMemo(
    () => analysis.anomalies.filter((a) => a.severity === 'warning').length,
    [analysis.anomalies]
  );

  return {
    analysis,
    anomalies: analysis.anomalies,
    hasAnomalies: analysis.hasAnomalies,
    errorCount,
    warningCount,
    selfIntersections: analysis.selfIntersections,
    directionReversals: analysis.directionReversals,
    stepSizeAdvice: analysis.stepSizeAdvice,
    pathLength: analysis.pathLength,
    getAnomalyTypeLabel,
    getSeverityLabel,
    getSeverityColor,
    filterAnomaliesBySeverity: (severity?: 'error' | 'warning') =>
      filterAnomaliesBySeverity(analysis.anomalies, severity),
    groupAnomaliesByType: () => groupAnomaliesByType(analysis.anomalies),
  };
}
