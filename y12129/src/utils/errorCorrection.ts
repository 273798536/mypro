import { MeasurementPoint, CorrectedPoint, FittingResult } from '../types';

export function correctMeasurement(
  measuredValue: number,
  systematicOffset: number
): number {
  return measuredValue - systematicOffset;
}

export function isWithinTolerance(
  value: number,
  designSize: number,
  tolerance: number
): boolean {
  const lowerBound = designSize - tolerance;
  const upperBound = designSize + tolerance;
  return value >= lowerBound && value <= upperBound;
}

export function correctAllMeasurements(
  measurementPoints: MeasurementPoint[],
  fittingResult: FittingResult
): CorrectedPoint[] {
  return measurementPoints.map((point) => {
    const residualEntry = fittingResult.residuals.find(
      (r) => r.pointId === point.id
    );

    const correctedValue = point.isMissing
      ? 0
      : correctMeasurement(point.measuredValue, fittingResult.systematicOffset);

    const isPass = point.isMissing
      ? false
      : isWithinTolerance(correctedValue, point.designSize, point.tolerance);

    return {
      pointId: point.id,
      pointName: point.pointName,
      designSize: point.designSize,
      measuredValue: point.measuredValue,
      correctedValue,
      residual: residualEntry?.residual ?? 0,
      tolerance: point.tolerance,
      isPass,
      isMissing: point.isMissing ?? false,
      isContaminated: point.isContaminated ?? false,
      rawDataRef: point.rawDataRef,
      fixtureId: point.fixtureId,
      x: point.x,
    };
  });
}

export function calculateStatistics(correctedPoints: CorrectedPoint[]): {
  avgErrorBefore: number;
  avgErrorAfter: number;
  passRate: number;
  failCount: number;
} {
  const validPoints = correctedPoints.filter(
    (p) => !p.isMissing && !p.isContaminated
  );

  if (validPoints.length === 0) {
    return {
      avgErrorBefore: 0,
      avgErrorAfter: 0,
      passRate: 0,
      failCount: 0,
    };
  }

  const totalErrorBefore = validPoints.reduce(
    (sum, p) => sum + Math.abs(p.measuredValue - p.designSize),
    0
  );

  const totalErrorAfter = validPoints.reduce(
    (sum, p) => sum + Math.abs(p.correctedValue - p.designSize),
    0
  );

  const passCount = validPoints.filter((p) => p.isPass).length;
  const failCount = validPoints.filter((p) => !p.isPass).length;

  return {
    avgErrorBefore: totalErrorBefore / validPoints.length,
    avgErrorAfter: totalErrorAfter / validPoints.length,
    passRate: passCount / validPoints.length,
    failCount,
  };
}
