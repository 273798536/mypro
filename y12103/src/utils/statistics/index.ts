export function mean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

export function variance(data: number[]): number {
  if (data.length < 2) return 0;
  const m = mean(data);
  const squaredDiffs = data.map((val) => Math.pow(val - m, 2));
  return mean(squaredDiffs);
}

export function standardDeviation(data: number[]): number {
  return Math.sqrt(variance(data));
}

export function median(data: number[]): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percentile(data: number[], p: number): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function zScore(serviceLevel: number): number {
  const zTable: Record<number, number> = {
    0.90: 1.2816,
    0.95: 1.6449,
    0.97: 1.8808,
    0.98: 2.0537,
    0.99: 2.3263,
    0.995: 2.5758,
    0.999: 3.0902,
  };
  
  if (zTable[serviceLevel]) return zTable[serviceLevel];
  
  const levels = Object.keys(zTable).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < levels.length - 1; i++) {
    if (serviceLevel > levels[i] && serviceLevel < levels[i + 1]) {
      const ratio = (serviceLevel - levels[i]) / (levels[i + 1] - levels[i]);
      return zTable[levels[i]] + ratio * (zTable[levels[i + 1]] - zTable[levels[i]]);
    }
  }
  
  return serviceLevel >= 0.999 ? 3.0902 : 1.6449;
}

export function normalPDF(x: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return x === mean ? Infinity : 0;
  const exp = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exp);
}

export function normalCDF(x: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return x >= mean ? 1 : 0;
  const z = (x - mean) / stdDev;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

export function poissonPMF(k: number, lambda: number): number {
  if (lambda === 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function poissonCDF(k: number, lambda: number): number {
  if (lambda === 0) return k >= 0 ? 1 : 0;
  let sum = 0;
  for (let i = 0; i <= Math.floor(k); i++) {
    sum += poissonPMF(i, lambda);
  }
  return Math.min(sum, 1);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

export function poissonQuantile(p: number, lambda: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  if (lambda === 0) return 0;
  
  let k = 0;
  let cdf = 0;
  while (cdf < p && k < 1000) {
    cdf += poissonPMF(k, lambda);
    if (cdf >= p) return k;
    k++;
  }
  return k;
}

export function movingAverage(data: number[], windowSize: number): number[] {
  if (windowSize <= 0 || data.length < windowSize) return [];
  
  const result: number[] = [];
  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1);
    result.push(mean(window));
  }
  return result;
}

export function weightedMovingAverage(data: number[], weights: number[]): number[] {
  if (weights.length === 0 || data.length < weights.length) return [];
  
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map(w => w / weightSum);
  
  const result: number[] = [];
  const windowSize = weights.length;
  
  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1);
    const weighted = window.reduce((sum, val, idx) => sum + val * normalizedWeights[idx], 0);
    result.push(weighted);
  }
  return result;
}

export function exponentialSmoothing(data: number[], alpha: number = 0.3): number[] {
  if (data.length === 0 || alpha <= 0 || alpha > 1) return [];
  
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

export function coefficientOfVariation(data: number[]): number {
  const m = mean(data);
  if (m === 0) return 0;
  return standardDeviation(data) / m;
}

export function autoSelectModel(historicalDemand: number[]): 'poisson' | 'normal' | 'moving_average' {
  if (historicalDemand.length < 7) return 'poisson';
  
  const cv = coefficientOfVariation(historicalDemand);
  const zeroCount = historicalDemand.filter(d => d === 0).length;
  const zeroRatio = zeroCount / historicalDemand.length;
  const meanDemand = mean(historicalDemand);
  
  if (meanDemand < 5 || zeroRatio > 0.3) {
    return 'poisson';
  }
  
  if (cv < 0.5 && zeroRatio < 0.1) {
    return 'normal';
  }
  
  return 'moving_average';
}

export function calculateHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function roundTo(n: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function addDays(date: Date | string, days: number): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : new Date(date1);
  const d2 = typeof date2 === 'string' ? new Date(date2) : new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
