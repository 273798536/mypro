import { evaluate } from 'mathjs';
import type { InterpolationConfig, InterpolationPoint, CalculationResult, AnomalyRecord } from './types';
import { detectAnomalies } from './anomalyDetector';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function evaluateFunction(expr: string, x: number): number {
  try {
    return evaluate(expr, { x });
  } catch {
    return NaN;
  }
}

export function generatePoints(config: InterpolationConfig): InterpolationPoint[] {
  const points: InterpolationPoint[] = [];
  const step = (config.sampleEnd - config.sampleStart) / (config.pointCount - 1);
  
  for (let i = 0; i < config.pointCount; i++) {
    const x = config.sampleStart + i * step;
    const y = evaluateFunction(config.functionExpression, x);
    points.push({ x, y });
  }
  
  return points;
}

export function generateDensePoints(config: InterpolationConfig, count: number = 200): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const step = (config.sampleEnd - config.sampleStart) / (count - 1);
  
  for (let i = 0; i < count; i++) {
    const x = config.sampleStart + i * step;
    const y = evaluateFunction(config.functionExpression, x);
    points.push({ x, y });
  }
  
  return points;
}

export function lagrangeInterpolate(points: InterpolationPoint[], x: number): number {
  let result = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    let term = points[i].y;
    for (let j = 0; j < n; j++) {
      if (j !== i) {
        term = term * (x - points[j].x) / (points[i].x - points[j].x);
      }
    }
    result += term;
  }
  
  return result;
}

export function newtonInterpolate(points: InterpolationPoint[], x: number): number {
  const n = points.length;
  const dividedDiff: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    dividedDiff[i][0] = points[i].y;
  }
  
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n - j; i++) {
      dividedDiff[i][j] = (dividedDiff[i + 1][j - 1] - dividedDiff[i][j - 1]) / (points[i + j].x - points[i].x);
    }
  }
  
  let result = dividedDiff[0][0];
  let term = 1;
  for (let j = 1; j < n; j++) {
    term *= (x - points[j - 1].x);
    result += dividedDiff[0][j] * term;
  }
  
  return result;
}

export function interpolate(points: InterpolationPoint[], x: number, method: 'lagrange' | 'newton'): number {
  if (points.length < 2) return NaN;
  return method === 'lagrange' 
    ? lagrangeInterpolate(points, x) 
    : newtonInterpolate(points, x);
}

export function calculateOscillationIntensity(values: number[]): number {
  if (values.length < 3) return 0;
  
  let totalVariation = 0;
  for (let i = 1; i < values.length; i++) {
    totalVariation += Math.abs(values[i] - values[i - 1]);
  }
  
  const range = Math.max(...values) - Math.min(...values);
  if (range === 0) return 0;
  
  return totalVariation / (range * (values.length - 1));
}

export function performCalculation(config: InterpolationConfig): CalculationResult {
  const originalPoints = generatePoints(config);
  const anomalies = detectAnomalies(originalPoints, config);
  
  const validPoints = originalPoints.filter(p => !p.isDuplicate);
  const denseSamples = 200;
  const interpolatedPoints: { x: number; y: number; error: number; originalY: number }[] = [];
  const step = (config.sampleEnd - config.sampleStart) / (denseSamples - 1);
  
  const edgeMargin = (config.sampleEnd - config.sampleStart) * 0.1;
  const edgeStart = config.sampleStart + edgeMargin;
  const edgeEnd = config.sampleEnd - edgeMargin;
  
  for (let i = 0; i < denseSamples; i++) {
    const x = config.sampleStart + i * step;
    const originalY = evaluateFunction(config.functionExpression, x);
    const interpolatedY = interpolate(validPoints.slice(0, config.order + 1), x, config.method);
    const error = Math.abs(interpolatedY - originalY);
    
    const isExtrapolated = x < originalPoints[0].x || x > originalPoints[originalPoints.length - 1].x;
    const isEdgeRegion = x < edgeStart || x > edgeEnd;
    
    interpolatedPoints.push({
      x,
      y: interpolatedY,
      error,
      originalY,
    });
    
    if (isEdgeRegion && !isExtrapolated) {
      const oscillationAnomaly = anomalies.find(a => a.type === 'oscillation');
      if (oscillationAnomaly && !oscillationAnomaly.affectedIndices.includes(i)) {
        oscillationAnomaly.affectedIndices.push(i);
      }
    }
  }
  
  const errors = interpolatedPoints.map(p => p.error);
  const maxError = Math.max(...errors);
  const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const oscillationIntensity = calculateOscillationIntensity(interpolatedPoints.map(p => p.y));
  
  return {
    originalPoints,
    interpolatedPoints,
    anomalies,
    maxError,
    avgError,
    oscillationIntensity,
  };
}

export function resolveAnomaly(anomaly: AnomalyRecord, resolutionNote: string): AnomalyRecord {
  return {
    ...anomaly,
    resolved: true,
    resolutionNote,
    timestamp: Date.now(),
  };
}

export function createAnomalyRecord(
  type: 'duplicate' | 'extrapolation' | 'oscillation',
  severity: 'warning' | 'error' | 'info',
  message: string,
  affectedIndices: number[] = []
): AnomalyRecord {
  return {
    id: generateId(),
    type,
    severity,
    message,
    affectedIndices,
    resolved: false,
    timestamp: Date.now(),
  };
}
