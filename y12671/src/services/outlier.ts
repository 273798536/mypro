import { OutlierStatistics } from '@/types';

export function detectOutliers(data: number[]): boolean[] {
  if (data.length === 0) return [];

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
  const std = Math.sqrt(variance);

  if (std === 0) {
    return data.map(() => false);
  }

  return data.map((x) => Math.abs(x - mean) > 3 * std);
}

export function detectOutliersIQR(data: number[]): boolean[] {
  if (data.length < 4) return data.map(() => false);

  const sorted = [...data].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  return data.map((x) => x < lowerFence || x > upperFence);
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateStatistics(data: number[]): OutlierStatistics {
  if (data.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0, median: 0, outlierIndices: [] };
  }

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
  const std = Math.sqrt(variance);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const sorted = [...data].sort((a, b) => a - b);
  const med = median(sorted);

  const outlierFlags = detectOutliers(data);
  const outlierIndices = outlierFlags
    .map((flag, idx) => (flag ? idx : -1))
    .filter((idx) => idx !== -1);

  return { mean, std, min, max, median: med, outlierIndices };
}
