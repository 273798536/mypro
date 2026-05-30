import { MeasurementPoint, FittingResult } from '../types';

export function linearLeastSquares(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = points.length;
  if (n < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const ssTotal = sumYY - (sumY * sumY) / n;
  const ssResidual = sumYY - slope * sumXY - intercept * sumY;
  const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  return { slope, intercept, rSquared };
}

export function performFitting(
  measurementPoints: MeasurementPoint[]
): FittingResult {
  const validPoints = measurementPoints.filter(
    (p) => !p.isMissing && !p.isContaminated
  );

  const points = validPoints.map((p) => ({
    x: p.x,
    y: p.measuredValue,
  }));

  const { slope, intercept, rSquared } = linearLeastSquares(points);

  const residuals = validPoints.map((p) => {
    const fittedValue = slope * p.x + intercept;
    return {
      pointId: p.id,
      residual: p.measuredValue - fittedValue,
    };
  });

  const avgResidual =
    residuals.reduce((sum, r) => sum + r.residual, 0) / residuals.length;

  const systematicOffset = avgResidual;

  return {
    slope,
    intercept,
    rSquared,
    systematicOffset,
    residuals,
  };
}

export function predictValue(
  x: number,
  slope: number,
  intercept: number
): number {
  return slope * x + intercept;
}
