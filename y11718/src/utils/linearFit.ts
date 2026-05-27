import { LinearFitResult } from '../types';

export function linearRegression(
  data: { x: number; y: number }[]
): LinearFitResult {
  const n = data.length;
  if (n < 2) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      points: data,
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssTotal = 0;
  let ssResidual = 0;

  for (const point of data) {
    const predicted = slope * point.x + intercept;
    ssTotal += Math.pow(point.y - yMean, 2);
    ssResidual += Math.pow(point.y - predicted, 2);
  }

  const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  return {
    slope,
    intercept,
    rSquared,
    points: data,
  };
}
