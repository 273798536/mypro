import { MeasurementPoint, AnomalyInfo, AnomalyType } from '../types';

export function detectMissingPoints(
  points: MeasurementPoint[],
  requiredPointNames: string[]
): string[] {
  const existingNames = points
    .filter((p) => !p.isMissing)
    .map((p) => p.pointName);

  return requiredPointNames.filter((name) => !existingNames.includes(name));
}

export function detectContaminatedBatches(
  points: MeasurementPoint[]
): string[] {
  const batchFixtureMap = new Map<string, Set<string>>();

  for (const point of points) {
    if (!batchFixtureMap.has(point.batchNo)) {
      batchFixtureMap.set(point.batchNo, new Set());
    }
    batchFixtureMap.get(point.batchNo)!.add(point.fixtureId);
  }

  const contaminatedIds: string[] = [];

  for (const [batchNo, fixtureIds] of batchFixtureMap.entries()) {
    if (fixtureIds.size > 1) {
      const batchPoints = points.filter((p) => p.batchNo === batchNo);
      const fixtureCounts = new Map<string, number>();

      for (const point of batchPoints) {
        fixtureCounts.set(
          point.fixtureId,
          (fixtureCounts.get(point.fixtureId) ?? 0) + 1
        );
      }

      let dominantFixture = '';
      let maxCount = 0;
      for (const [fixtureId, count] of fixtureCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          dominantFixture = fixtureId;
        }
      }

      for (const point of batchPoints) {
        if (point.fixtureId !== dominantFixture) {
          contaminatedIds.push(point.id);
        }
      }
    }
  }

  return contaminatedIds;
}

export function markAnomalies(
  points: MeasurementPoint[],
  requiredPointNames: string[]
): MeasurementPoint[] {
  const contaminatedIds = detectContaminatedBatches(points);

  return points.map((point) => ({
    ...point,
    isContaminated: contaminatedIds.includes(point.id),
  }));
}

export function getAnomalyInfo(point: {
  isMissing: boolean;
  isContaminated: boolean;
  isPass: boolean;
}): AnomalyInfo {
  if (point.isMissing) {
    return {
      type: 'missing',
      severity: 'critical',
      message: '点位缺失',
    };
  }

  if (point.isContaminated) {
    return {
      type: 'contaminated',
      severity: 'error',
      message: '批次混入',
    };
  }

  if (!point.isPass) {
    return {
      type: 'out_of_tolerance',
      severity: 'warning',
      message: '超出公差',
    };
  }

  return {
    type: 'none',
    severity: 'warning',
    message: '正常',
  };
}

export function getAnomalyBadgeColor(type: AnomalyType): string {
  switch (type) {
    case 'missing':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'contaminated':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'out_of_tolerance':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-green-100 text-green-800 border-green-300';
  }
}
