import { QC_THRESHOLDS } from '@/data/formulas';
import type { QCStatus, MigrationDataPoint } from '@/types';

export function calculateScratchArea(
  pixelArea: number,
  calibrationFactor: number
): number {
  if (pixelArea <= 0) {
    throw new Error('像素面积必须大于0');
  }
  if (calibrationFactor <= 0) {
    throw new Error('校准系数必须大于0');
  }
  return parseFloat((pixelArea * calibrationFactor).toFixed(4));
}

export function calculateMigrationRate(
  initialArea: number,
  currentArea: number,
  timePoint: number
): { rate: number; isValid: boolean; reason?: string } {
  if (initialArea <= 0) {
    return { rate: 0, isValid: false, reason: '初始面积不能为零或负数' };
  }
  if (currentArea < 0) {
    return { rate: 0, isValid: false, reason: '当前面积不能为负数' };
  }
  if (currentArea > initialArea) {
    return { rate: 0, isValid: false, reason: '当前面积大于初始面积，可能存在划痕区域扩张' };
  }
  if (timePoint < 0) {
    return { rate: 0, isValid: false, reason: '时间点不能为负数' };
  }

  const rate = ((initialArea - currentArea) / initialArea) * 100;
  return { rate: parseFloat(rate.toFixed(2)), isValid: true };
}

export function calculateCV(values: number[]): { cv: number; isValid: boolean; reason?: string } {
  if (values.length < 3) {
    return { cv: 0, isValid: false, reason: '计算CV至少需要3个数据点' };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) {
    return { cv: 0, isValid: false, reason: '均值为零，无法计算CV' };
  }

  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;

  return { cv: parseFloat(cv.toFixed(2)), isValid: true };
}

export function calculateZPrime(
  sampleValues: number[],
  controlValues: number[]
): { zPrime: number; isValid: boolean; reason?: string } {
  if (sampleValues.length < 3 || controlValues.length < 3) {
    return { zPrime: 0, isValid: false, reason: '计算Z\'因子每组至少需要3个数据点' };
  }

  const sampleMean = sampleValues.reduce((a, b) => a + b, 0) / sampleValues.length;
  const controlMean = controlValues.reduce((a, b) => a + b, 0) / controlValues.length;

  const sampleVar = sampleValues.reduce((acc, val) => acc + Math.pow(val - sampleMean, 2), 0) / sampleValues.length;
  const controlVar = controlValues.reduce((acc, val) => acc + Math.pow(val - controlMean, 2), 0) / controlValues.length;

  const sampleStd = Math.sqrt(sampleVar);
  const controlStd = Math.sqrt(controlVar);

  const denominator = Math.abs(sampleMean - controlMean);
  if (denominator === 0) {
    return { zPrime: 0, isValid: false, reason: '样本组与对照组均值相同，无法计算Z\'因子' };
  }

  const zPrime = 1 - (3 * sampleStd + 3 * controlStd) / denominator;
  return { zPrime: parseFloat(zPrime.toFixed(3)), isValid: true };
}

export function determineQCStatus(
  cvValue: number,
  zPrimeFactor: number,
  cellViability: number
): { status: QCStatus; issues: string[] } {
  const issues: string[] = [];

  if (cvValue > QC_THRESHOLDS.cvMax) {
    issues.push(`CV值 ${cvValue}% 超过阈值 ${QC_THRESHOLDS.cvMax}%`);
  }
  if (zPrimeFactor < QC_THRESHOLDS.zPrimeMin) {
    issues.push(`Z'因子 ${zPrimeFactor} 低于阈值 ${QC_THRESHOLDS.zPrimeMin}`);
  }
  if (cellViability < QC_THRESHOLDS.cellViabilityMin) {
    issues.push(`细胞存活率 ${cellViability}% 低于要求的 ${QC_THRESHOLDS.cellViabilityMin}%`);
  }

  if (issues.length === 0) {
    return { status: 'pass', issues: [] };
  } else if (issues.length <= 1) {
    return { status: 'warning', issues };
  } else {
    return { status: 'fail', issues };
  }
}

export function calculateMigrationKinetic(
  dataPoints: MigrationDataPoint[]
): {
  averageSpeed: number;
  maxSpeed: number;
  trend: 'accelerating' | 'decelerating' | 'linear';
  rSquared: number;
} {
  const validPoints = dataPoints.filter(d => d.timePoint > 0 && d.migrationRate > 0);

  if (validPoints.length < 2) {
    return {
      averageSpeed: 0,
      maxSpeed: 0,
      trend: 'linear',
      rSquared: 0
    };
  }

  const speeds: number[] = [];
  for (let i = 0; i < validPoints.length; i++) {
    const prev = i === 0 ? dataPoints[0] : validPoints[i - 1];
    const curr = validPoints[i];
    const timeDiff = curr.timePoint - prev.timePoint;
    const rateDiff = curr.migrationRate - prev.migrationRate;
    if (timeDiff > 0) {
      speeds.push(rateDiff / timeDiff);
    }
  }

  const averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const maxSpeed = Math.max(...speeds);

  let trend: 'accelerating' | 'decelerating' | 'linear' = 'linear';
  if (speeds.length >= 2) {
    const firstHalf = speeds.slice(0, Math.floor(speeds.length / 2));
    const secondHalf = speeds.slice(Math.floor(speeds.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.2) {
      trend = 'accelerating';
    } else if (secondAvg < firstAvg * 0.8) {
      trend = 'decelerating';
    }
  }

  const xMean = validPoints.reduce((a, b) => a + b.timePoint, 0) / validPoints.length;
  const yMean = validPoints.reduce((a, b) => a + b.migrationRate, 0) / validPoints.length;

  let ssTotal = 0;
  let ssResidual = 0;
  let numerator = 0;
  let denominator = 0;

  for (const point of validPoints) {
    numerator += (point.timePoint - xMean) * (point.migrationRate - yMean);
    denominator += Math.pow(point.timePoint - xMean, 2);
  }

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  for (const point of validPoints) {
    const predicted = slope * point.timePoint + intercept;
    ssResidual += Math.pow(point.migrationRate - predicted, 2);
    ssTotal += Math.pow(point.migrationRate - yMean, 2);
  }

  const rSquared = ssTotal > 0 ? parseFloat((1 - ssResidual / ssTotal).toFixed(4)) : 0;

  return {
    averageSpeed: parseFloat(averageSpeed.toFixed(4)),
    maxSpeed: parseFloat(maxSpeed.toFixed(4)),
    trend,
    rSquared
  };
}

export function validateDataQuality(
  dataPoints: MigrationDataPoint[]
): {
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const zeroHourPoint = dataPoints.find(d => d.timePoint === 0);
  if (!zeroHourPoint) {
    issues.push('缺少0h时间点数据');
    suggestions.push('补充0h初始划痕图像');
    score -= 30;
  }

  const expectedTimePoints = [0, 6, 12, 24];
  const missingPoints = expectedTimePoints.filter(t => !dataPoints.find(d => d.timePoint === t));
  if (missingPoints.length > 0) {
    issues.push(`缺少时间点: ${missingPoints.map(t => `${t}h`).join(', ')}`);
    suggestions.push('建议补充缺失的时间点数据以获得更准确的动力学分析');
    score -= missingPoints.length * 15;
  }

  const poorQualityPoints = dataPoints.filter(d => d.areaQuality === 'poor');
  if (poorQualityPoints.length > 0) {
    issues.push(`${poorQualityPoints.length}个时间点图像质量较差`);
    suggestions.push('考虑重新采集图像或调整分析区域');
    score -= poorQualityPoints.length * 10;
  }

  const fairQualityPoints = dataPoints.filter(d => d.areaQuality === 'fair');
  if (fairQualityPoints.length > 0) {
    suggestions.push(`${fairQualityPoints.length}个时间点图像质量一般，建议人工复核`);
  }

  for (let i = 1; i < dataPoints.length; i++) {
    if (dataPoints[i].areaMm2 > dataPoints[i - 1].areaMm2) {
      issues.push(`${dataPoints[i].timePoint}h面积大于前一时间点`);
      suggestions.push('检查是否存在细胞增殖过快或图像分析区域偏差');
      score -= 10;
    }
  }

  return {
    isValid: score >= 60,
    score: Math.max(0, score),
    issues,
    suggestions
  };
}
