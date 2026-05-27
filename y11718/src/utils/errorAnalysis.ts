import { Measurement, Warning, ErrorBreakdown } from '../types';
import { calculateSoundSpeed, calculateTheoreticalSpeed } from './soundSpeed';

export function detectOutliersIQR(measurements: Measurement[]): string[] {
  const lengths = measurements.map((m) => m.tubeLength).sort((a, b) => a - b);
  const q1 = lengths[Math.floor(lengths.length / 4)];
  const q3 = lengths[Math.ceil((3 * lengths.length) / 4) - 1];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return measurements
    .filter((m) => m.tubeLength < lowerBound || m.tubeLength > upperBound)
    .map((m) => m.id);
}

export function checkNodeNumbering(measurements: Measurement[]): string[] {
  const sorted = [...measurements].sort((a, b) => a.nodeNumber - b.nodeNumber);
  const issues: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].nodeNumber !== i + 1) {
      issues.push(sorted[i].id);
    }
  }

  return issues;
}

export function checkTemperatureCorrection(
  measurements: Measurement[]
): boolean {
  return measurements.some((m) => !m.isTemperatureCorrected);
}

export function generateWarnings(
  measurements: Measurement[],
  temperature: number
): Warning[] {
  const warnings: Warning[] = [];

  const outlierIds = detectOutliersIQR(measurements);
  outlierIds.forEach((id) => {
    const m = measurements.find((x) => x.id === id);
    if (m) {
      warnings.push({
        type: 'outlier',
        message: `第 ${m.nodeNumber} 号节点数据 (${m.tubeLength} cm) 可能是离群值`,
        severity: 'medium',
        measurementId: id,
      });
    }
  });

  const nodeIssues = checkNodeNumbering(measurements);
  if (nodeIssues.length > 0) {
    warnings.push({
      type: 'nodeNumber',
      message: `检测到 ${nodeIssues.length} 个节点编号可能存在错误`,
      severity: 'high',
    });
  }

  if (checkTemperatureCorrection(measurements)) {
    warnings.push({
      type: 'temperature',
      message: '部分测量数据未进行温度修正',
      severity: 'high',
    });
  }

  if (temperature < 0 || temperature > 40) {
    warnings.push({
      type: 'temperature',
      message: `温度 ${temperature}°C 超出正常实验范围 (0-40°C)`,
      severity: 'medium',
    });
  }

  if (measurements.length < 3) {
    warnings.push({
      type: 'missingData',
      message: '测量数据不足，建议至少3组数据以获得可靠结果',
      severity: 'low',
    });
  }

  return warnings;
}

export function calculateErrorBreakdown(
  measurements: Measurement[],
  frequency: number,
  temperature: number,
  rSquared: number
): ErrorBreakdown {
  const totalError = 100 - rSquared * 100;

  const hasOutliers = measurements.some((m) => m.isOutlier);
  const outlierInfluence = hasOutliers ? totalError * 0.4 : 0;

  const hasUncorrected = measurements.some((m) => !m.isTemperatureCorrected);
  const temperatureError = hasUncorrected ? totalError * 0.3 : totalError * 0.1;

  const measurementError = totalError * 0.3;
  const frequencyError = totalError * 0.1;
  const otherErrors = totalError - temperatureError - measurementError - frequencyError - outlierInfluence;

  return {
    temperatureError: Math.max(0, temperatureError),
    measurementError: Math.max(0, measurementError),
    frequencyError: Math.max(0, frequencyError),
    outlierInfluence: Math.max(0, outlierInfluence),
    otherErrors: Math.max(0, otherErrors),
  };
}
