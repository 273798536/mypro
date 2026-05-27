import type { MediumLayer, ValidationResult, ArrivalTime, RayPath } from '@/types';

export function validateVelocities(layers: MediumLayer[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  layers.forEach((layer, i) => {
    if (layer.pVelocity === 0) {
      results.push({
        level: 'error',
        code: 'ZERO_VELOCITY',
        message: `第${i + 1}层「${layer.name}」P波速度为零，无法计算走时`,
        affectedIds: [layer.id],
      });
    }
    if (layer.sVelocity === 0) {
      results.push({
        level: 'error',
        code: 'ZERO_VELOCITY',
        message: `第${i + 1}层「${layer.name}」S波速度为零，无法计算走时`,
        affectedIds: [layer.id],
      });
    }
    if (layer.pVelocity < 0) {
      results.push({
        level: 'error',
        code: 'NEGATIVE_VELOCITY',
        message: `第${i + 1}层「${layer.name}」P波速度为负值(${layer.pVelocity})，物理不可能`,
        affectedIds: [layer.id],
      });
    }
    if (layer.sVelocity < 0) {
      results.push({
        level: 'error',
        code: 'NEGATIVE_VELOCITY',
        message: `第${i + 1}层「${layer.name}」S波速度为负值(${layer.sVelocity})，物理不可能`,
        affectedIds: [layer.id],
      });
    }
  });

  return results;
}

export function validateLayerContinuity(layers: MediumLayer[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const sorted = [...layers].sort((a, b) => a.topDepth - b.topDepth);

  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].topDepth - sorted[i].bottomDepth;
    if (gap > 0.01) {
      results.push({
        level: 'warning',
        code: 'MISSING_LAYER',
        message: `层${i + 1}底部(${sorted[i].bottomDepth}km)与层${i + 2}顶部(${sorted[i + 1].topDepth}km)之间存在${gap.toFixed(1)}km间隙`,
        affectedIds: [sorted[i].id, sorted[i + 1].id],
      });
    } else if (gap < -0.01) {
      results.push({
        level: 'error',
        code: 'LAYER_OVERLAP',
        message: `层${i + 1}与层${i + 2}重叠${Math.abs(gap).toFixed(1)}km`,
        affectedIds: [sorted[i].id, sorted[i + 1].id],
      });
    }
  }

  return results;
}

export function validateVelocityInversion(layers: MediumLayer[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const sorted = [...layers].sort((a, b) => a.topDepth - b.topDepth);

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].pVelocity > sorted[i + 1].pVelocity && sorted[i + 1].pVelocity > 0) {
      results.push({
        level: 'warning',
        code: 'VELOCITY_INVERSION',
        message: `层${i + 1}「${sorted[i].name}」P波速度(${sorted[i].pVelocity})大于层${i + 2}「${sorted[i + 1].name}」(${sorted[i + 1].pVelocity})，可能产生速度反转`,
        affectedIds: [sorted[i].id, sorted[i + 1].id],
      });
    }
    if (sorted[i].sVelocity > sorted[i + 1].sVelocity && sorted[i + 1].sVelocity > 0) {
      results.push({
        level: 'warning',
        code: 'VELOCITY_INVERSION',
        message: `层${i + 1}「${sorted[i].name}」S波速度(${sorted[i].sVelocity})大于层${i + 2}「${sorted[i + 1].name}」(${sorted[i + 1].sVelocity})，可能产生速度反转`,
        affectedIds: [sorted[i].id, sorted[i + 1].id],
      });
    }
  }

  return results;
}

export function validateArrivalSorting(arrivals: ArrivalTime[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const stationIds = [...new Set(arrivals.map(a => a.stationId))];

  stationIds.forEach(stationId => {
    const stationArrivals = arrivals.filter(a => a.stationId === stationId);
    const pArrival = stationArrivals.find(a => a.waveType === 'P');
    const sArrival = stationArrivals.find(a => a.waveType === 'S');

    if (pArrival && sArrival) {
      if (sArrival.time < pArrival.time) {
        results.push({
          level: 'error',
          code: 'ARRIVAL_SORT_ERROR',
          message: `测站${stationId}的S波到达时间(${sArrival.time.toFixed(2)}s)早于P波(${pArrival.time.toFixed(2)}s)，物理不可能`,
          affectedIds: [stationId],
        });
      }
    }
  });

  return results;
}

export function validateCrossLayerErrors(rayPaths: RayPath[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  rayPaths.forEach(rp => {
    if (!rp.isValid) {
      rp.validationErrors.forEach(err => {
        results.push({
          level: 'error',
          code: 'CROSS_LAYER_ERROR',
          message: `${rp.waveType}波射线追踪错误: ${err}`,
          affectedIds: [rp.stationId],
        });
      });
    }
  });

  return results;
}

export function validateAll(
  layers: MediumLayer[],
  arrivals: ArrivalTime[],
  rayPaths: RayPath[]
): ValidationResult[] {
  return [
    ...validateVelocities(layers),
    ...validateLayerContinuity(layers),
    ...validateVelocityInversion(layers),
    ...validateArrivalSorting(arrivals),
    ...validateCrossLayerErrors(rayPaths),
  ];
}
