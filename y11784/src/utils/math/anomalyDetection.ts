import type { Point2D, Anomaly } from '@/types';
import {
  findSelfIntersections,
  findDirectionReversals,
  pathLength,
} from './pathGeometry';
import { ANOMALY_THRESHOLDS } from '@/shared/constants';

export interface PathAnalysis {
  anomalies: Anomaly[];
  hasAnomalies: boolean;
  pathLength: number;
  selfIntersections: Array<{
    intersection: Point2D;
    segment1: [number, number];
    segment2: [number, number];
  }>;
  directionReversals: Array<{ index: number; point: Point2D; angle: number }>;
  stepSizeAdvice: {
    recommended: number;
    current: number;
    isTooLarge: boolean;
    isWarning: boolean;
  } | null;
}

export function analyzePath(
  nodes: Point2D[],
  stepSize: number,
  resultId: string
): PathAnalysis {
  const anomalies: Anomaly[] = [];
  const length = pathLength(nodes);

  const selfIntersections = findSelfIntersections(nodes);
  selfIntersections.forEach((item, idx) => {
    anomalies.push({
      id: `${resultId}-self-${idx}`,
      resultId,
      type: 'selfIntersection',
      severity: 'error',
      description: `路径在 (${item.intersection.x.toFixed(2)}, ${item.intersection.y.toFixed(2)}) 处发生自交，涉及线段 ${item.segment1[0]}-${item.segment1[1]} 和 ${item.segment2[0]}-${item.segment2[1]}。自交路径可能导致积分结果不可靠。`,
      positionX: item.intersection.x,
      positionY: item.intersection.y,
    });
  });

  const directionReversals = findDirectionReversals(
    nodes,
    ANOMALY_THRESHOLDS.directionReversalAngle
  );
  directionReversals.forEach((item, idx) => {
    anomalies.push({
      id: `${resultId}-dir-${idx}`,
      resultId,
      type: 'directionReversal',
      severity: 'warning',
      description: `路径在节点 ${item.index} 处方向突变 ${item.angle.toFixed(1)}°，超过阈值 ${ANOMALY_THRESHOLDS.directionReversalAngle}°。可能影响数值积分精度。`,
      positionX: item.point.x,
      positionY: item.point.y,
    });
  });

  let stepSizeAdvice: PathAnalysis['stepSizeAdvice'] = null;
  if (length > 0) {
    const recommendedStep = length / ANOMALY_THRESHOLDS.stepSizeRatio;
    const warningStep = length / ANOMALY_THRESHOLDS.stepSizeWarningRatio;
    const isTooLarge = stepSize > warningStep;
    const isWarning = stepSize > recommendedStep && !isTooLarge;

    stepSizeAdvice = {
      recommended: recommendedStep,
      current: stepSize,
      isTooLarge,
      isWarning,
    };

    if (isTooLarge) {
      anomalies.push({
        id: `${resultId}-step-error`,
        resultId,
        type: 'largeStepSize',
        severity: 'error',
        description: `当前步长 ${stepSize.toFixed(4)} 过大，建议不超过 ${recommendedStep.toFixed(4)} (路径长度 ${length.toFixed(2)} 的 1/${ANOMALY_THRESHOLDS.stepSizeRatio})。大步长可能导致严重的积分误差。`,
      });
    } else if (isWarning) {
      anomalies.push({
        id: `${resultId}-step-warning`,
        resultId,
        type: 'largeStepSize',
        severity: 'warning',
        description: `当前步长 ${stepSize.toFixed(4)} 略大，建议不超过 ${recommendedStep.toFixed(4)} (路径长度 ${length.toFixed(2)} 的 1/${ANOMALY_THRESHOLDS.stepSizeRatio})。考虑减小步长以提高精度。`,
      });
    }
  }

  return {
    anomalies,
    hasAnomalies: anomalies.length > 0,
    pathLength: length,
    selfIntersections,
    directionReversals,
    stepSizeAdvice,
  };
}

export function getAnomalyTypeLabel(type: Anomaly['type']): string {
  const labels: Record<Anomaly['type'], string> = {
    selfIntersection: '路径自交',
    largeStepSize: '步长过大',
    directionReversal: '方向反转',
  };
  return labels[type];
}

export function getSeverityLabel(severity: Anomaly['severity']): string {
  return severity === 'error' ? '错误' : '警告';
}

export function getSeverityColor(severity: Anomaly['severity']): string {
  return severity === 'error' ? '#ef4444' : '#f59e0b';
}

export function filterAnomaliesBySeverity(
  anomalies: Anomaly[],
  severity?: Anomaly['severity']
): Anomaly[] {
  if (!severity) return anomalies;
  return anomalies.filter((a) => a.severity === severity);
}

export function groupAnomaliesByType(
  anomalies: Anomaly[]
): Record<Anomaly['type'], Anomaly[]> {
  return anomalies.reduce((acc, anomaly) => {
    if (!acc[anomaly.type]) {
      acc[anomaly.type] = [];
    }
    acc[anomaly.type].push(anomaly);
    return acc;
  }, {} as Record<Anomaly['type'], Anomaly[]>);
}
