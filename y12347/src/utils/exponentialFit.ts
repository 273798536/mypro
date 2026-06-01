import { DataPoint, TimeUnit } from '../types';
import { convertFromSeconds, convertToSeconds } from './unitConversion';

export interface FitParameters {
  decayConstant: number;
  initialActivity: number;
  halfLife: number;
  rSquared: number;
  fitCurve: { time: number; count: number }[];
}

export function exponentialFit(
  dataPoints: DataPoint[],
  outputUnit: TimeUnit
): FitParameters {
  if (dataPoints.length < 2) {
    throw new Error('至少需要2个数据点才能进行拟合');
  }

  const validPoints = dataPoints.filter(p => {
    const count = p.correctedCount ?? p.count;
    return count > 0 && isFinite(count);
  });

  if (validPoints.length < 2) {
    throw new Error('有效数据点不足（扣除背景后计数需大于0）');
  }

  const times: number[] = [];
  const lnCounts: number[] = [];
  const counts: number[] = [];

  validPoints.forEach(p => {
    const count = p.correctedCount ?? p.count;
    times.push(convertToSeconds(p.time, outputUnit));
    lnCounts.push(Math.log(count));
    counts.push(count);
  });

  const n = times.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += times[i];
    sumY += lnCounts[i];
    sumXY += times[i] * lnCounts[i];
    sumXX += times[i] * times[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const decayConstant = -slope;
  const initialActivity = Math.exp(intercept);
  const halfLifeSeconds = Math.log(2) / decayConstant;
  const halfLife = convertFromSeconds(halfLifeSeconds, outputUnit);

  const yMean = sumY / n;
  let ssTotal = 0, ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const predictedY = intercept + slope * times[i];
    ssTotal += Math.pow(lnCounts[i] - yMean, 2);
    ssResidual += Math.pow(lnCounts[i] - predictedY, 2);
  }

  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 1;

  const fitCurve: { time: number; count: number }[] = [];
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);
  const nCurvePoints = 100;

  for (let i = 0; i <= nCurvePoints; i++) {
    const t = minTime + (maxTime - minTime) * (i / nCurvePoints);
    const predictedCount = initialActivity * Math.exp(-decayConstant * t);
    fitCurve.push({
      time: convertFromSeconds(t, outputUnit),
      count: predictedCount
    });
  }

  return {
    decayConstant,
    initialActivity,
    halfLife,
    rSquared,
    fitCurve
  };
}

export function calculatePredictedCount(
  time: number,
  timeUnit: TimeUnit,
  initialActivity: number,
  decayConstant: number
): number {
  const timeInSeconds = convertToSeconds(time, timeUnit);
  return initialActivity * Math.exp(-decayConstant * timeInSeconds);
}

export function calculateResidual(
  actualCount: number,
  predictedCount: number
): number {
  return actualCount - predictedCount;
}

export function calculateRSquared(
  actualCounts: number[],
  predictedCounts: number[]
): number {
  if (actualCounts.length !== predictedCounts.length || actualCounts.length < 2) {
    return 0;
  }

  const mean = actualCounts.reduce((sum, val) => sum + val, 0) / actualCounts.length;
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < actualCounts.length; i++) {
    ssTotal += Math.pow(actualCounts[i] - mean, 2);
    ssResidual += Math.pow(actualCounts[i] - predictedCounts[i], 2);
  }

  return ssTotal > 0 ? 1 - ssResidual / ssTotal : 1;
}

export function correctBackground(
  dataPoints: DataPoint[],
  backgroundValue: number,
  isDeducted: boolean
): DataPoint[] {
  if (!isDeducted || backgroundValue === 0) {
    return dataPoints.map(p => ({
      ...p,
      correctedCount: p.count
    }));
  }

  return dataPoints.map(p => ({
    ...p,
    correctedCount: Math.max(0, p.count - backgroundValue)
  }));
}
