import type { TemperaturePoint } from '@/types';

export interface FitResult {
  parameters: number[];
  rSquared: number;
  equation: string;
  fitPoints: TemperaturePoint[];
}

export function exponentialFit(points: TemperaturePoint[]): FitResult {
  const n = points.length;
  if (n < 3) {
    return {
      parameters: [0, 0, 0],
      rSquared: 0,
      equation: '数据不足',
      fitPoints: [],
    };
  }

  const T0 = points[0].temperature;
  const T_inf = points[n - 1].temperature;

  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
  const validPoints: { x: number; y: number }[] = [];

  for (let i = 0; i < n; i++) {
    const t = points[i].time;
    const T = points[i].temperature;
    const deltaT = T_inf - T;
    const deltaT0 = T_inf - T0;

    if (deltaT > 0.1 && deltaT0 > 0.1 && t > 0) {
      const y = Math.log(deltaT / deltaT0);
      if (isFinite(y)) {
        validPoints.push({ x: t, y });
        sumX += t;
        sumY += y;
        sumXX += t * t;
        sumXY += t * y;
      }
    }
  }

  if (validPoints.length < 3) {
    return linearFit(points);
  }

  const m = validPoints.length;
  const slope = (m * sumXY - sumX * sumY) / (m * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / m;

  const tau = -1 / slope;
  const A = T_inf - T0;

  const fitPoints: TemperaturePoint[] = points.map((p) => ({
    time: p.time,
    temperature: T0 + A * (1 - Math.exp(-p.time / tau)),
  }));

  const rSquared = calculateRSquared(points, fitPoints, 'temperature');
  const equation = `T(t) = ${T0.toFixed(2)} + ${A.toFixed(2)}(1 - e^(-t/${tau.toFixed(2)}))`;

  return {
    parameters: [T0, A, tau],
    rSquared,
    equation,
    fitPoints,
  };
}

export function linearFit(points: TemperaturePoint[]): FitResult {
  const n = points.length;
  if (n < 2) {
    return {
      parameters: [0, 0],
      rSquared: 0,
      equation: '数据不足',
      fitPoints: [],
    };
  }

  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;

  for (const p of points) {
    sumX += p.time;
    sumY += p.temperature;
    sumXX += p.time * p.time;
    sumXY += p.time * p.temperature;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const fitPoints: TemperaturePoint[] = points.map((p) => ({
    time: p.time,
    temperature: intercept + slope * p.time,
  }));

  const rSquared = calculateRSquared(points, fitPoints, 'temperature');
  const equation = `T(t) = ${intercept.toFixed(2)} + ${slope.toFixed(4)}t`;

  return {
    parameters: [intercept, slope],
    rSquared,
    equation,
    fitPoints,
  };
}

export function calculateRSquared(
  actual: TemperaturePoint[],
  predicted: TemperaturePoint[],
  field: keyof TemperaturePoint = 'temperature'
): number {
  if (actual.length !== predicted.length || actual.length === 0) return 0;

  const n = actual.length;
  let meanY = 0;

  for (let i = 0; i < n; i++) {
    meanY += actual[i][field] as number;
  }
  meanY /= n;

  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const y = actual[i][field] as number;
    const yPred = predicted[i][field] as number;
    ssTotal += Math.pow(y - meanY, 2);
    ssResidual += Math.pow(y - yPred, 2);
  }

  if (ssTotal === 0) return 1;
  return 1 - ssResidual / ssTotal;
}

export function bestFit(points: TemperaturePoint[]): FitResult {
  const expFit = exponentialFit(points);
  const linFit = linearFit(points);

  if (expFit.rSquared >= linFit.rSquared && expFit.rSquared > 0.5) {
    return expFit;
  }
  return linFit.rSquared > 0.5 ? linFit : expFit;
}
