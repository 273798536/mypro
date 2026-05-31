import {
  Anomaly,
  AnomalyType,
  Axis,
  GameFunction,
  ANOMALY_DESCRIPTIONS,
  ANOMALY_PENALTIES,
} from '@/types/game';

export function detectAxisConfusion(
  selected: Axis,
  correct: Axis,
  stepId: string
): Anomaly | null {
  if (selected !== correct) {
    return {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stepId,
      type: 'axis_confusion',
      description: ANOMALY_DESCRIPTIONS.axis_confusion(selected, correct),
      penalty: ANOMALY_PENALTIES.axis_confusion,
      resolved: false,
    };
  }
  return null;
}

export function detectIntervalReverse(
  selected: [number, number],
  correct: [number, number],
  stepId: string
): Anomaly | null {
  if (selected[0] > selected[1]) {
    return {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stepId,
      type: 'interval_reverse',
      description: ANOMALY_DESCRIPTIONS.interval_reverse(selected, correct),
      penalty: ANOMALY_PENALTIES.interval_reverse,
      resolved: false,
    };
  }
  return null;
}

export function detectInsufficientSlices(
  selected: number,
  stepId: string
): Anomaly | null {
  if (selected < 10) {
    return {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stepId,
      type: 'insufficient_slices',
      description: ANOMALY_DESCRIPTIONS.insufficient_slices(selected),
      penalty: ANOMALY_PENALTIES.insufficient_slices,
      resolved: false,
    };
  }
  return null;
}

export function checkAllAnomalies(
  gameFunction: GameFunction,
  selectedAxis: Axis,
  interval: [number, number],
  sliceCount: number,
  stepIds: { axis: string; interval: string; slice: string }
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const axisAnomaly = detectAxisConfusion(selectedAxis, gameFunction.correctAxis, stepIds.axis);
  if (axisAnomaly) anomalies.push(axisAnomaly);

  const intervalAnomaly = detectIntervalReverse(interval, gameFunction.correctInterval, stepIds.interval);
  if (intervalAnomaly) anomalies.push(intervalAnomaly);

  const sliceAnomaly = detectInsufficientSlices(sliceCount, stepIds.slice);
  if (sliceAnomaly) anomalies.push(sliceAnomaly);

  return anomalies;
}

export function getAnomalyTypeLabel(type: AnomalyType): string {
  const labels: Record<AnomalyType, string> = {
    axis_confusion: '轴线混淆',
    interval_reverse: '区间反向',
    insufficient_slices: '切片过少',
  };
  return labels[type];
}

export function getAnomalyIcon(type: AnomalyType): string {
  const icons: Record<AnomalyType, string> = {
    axis_confusion: '↺',
    interval_reverse: '⇅',
    insufficient_slices: '📊',
  };
  return icons[type];
}

export function getAnomalyColor(type: AnomalyType): string {
  return 'danger';
}

export function fixIntervalIfReversed(interval: [number, number]): [number, number] {
  if (interval[0] > interval[1]) {
    return [interval[1], interval[0]];
  }
  return interval;
}
