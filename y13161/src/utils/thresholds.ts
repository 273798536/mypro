import { ThresholdConfig } from '@/types';

export const defaultThresholds: ThresholdConfig[] = [
  {
    sensorType: 'wave_height',
    min: 0,
    max: 15,
    unit: 'm',
  },
  {
    sensorType: 'wave_speed',
    min: 0,
    max: 30,
    unit: 'm/s',
  },
  {
    sensorType: 'temperature',
    min: -2,
    max: 35,
    unit: 'C',
  },
];

export function getThreshold(sensorType: string): ThresholdConfig | undefined {
  return defaultThresholds.find((t) => t.sensorType === sensorType);
}

export function checkThreshold(
  value: number,
  sensorType: string
): {
  isAnomaly: boolean;
  type?: 'below_min' | 'above_max';
  severity?: 'warning' | 'critical';
  threshold: { min: number; max: number };
} {
  const threshold = getThreshold(sensorType);
  if (!threshold) {
    return { isAnomaly: false, threshold: { min: -Infinity, max: Infinity } };
  }

  const range = threshold.max - threshold.min;
  const warningRatio = 0.8;

  if (value > threshold.max) {
    const exceedRatio = (value - threshold.max) / range;
    return {
      isAnomaly: true,
      type: 'above_max',
      severity: exceedRatio > 0.5 ? 'critical' : 'warning',
      threshold: { min: threshold.min, max: threshold.max },
    };
  }

  if (value < threshold.min) {
    const belowRatio = (threshold.min - value) / range;
    return {
      isAnomaly: true,
      type: 'below_min',
      severity: belowRatio > 0.5 ? 'critical' : 'warning',
      threshold: { min: threshold.min, max: threshold.max },
    };
  }

  if (value > threshold.max * warningRatio) {
    return {
      isAnomaly: false,
      threshold: { min: threshold.min, max: threshold.max },
    };
  }

  return {
    isAnomaly: false,
    threshold: { min: threshold.min, max: threshold.max },
  };
}

export function updateThreshold(
  sensorType: string,
  min: number,
  max: number
): ThresholdConfig[] {
  return defaultThresholds.map((t) =>
    t.sensorType === sensorType ? { ...t, min, max } : t
  );
}
