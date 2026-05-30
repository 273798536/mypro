import type {
  VectorFieldFormula,
  Streamline,
  AnomalyRecord,
  AnomalyType,
  StreamlinePoint,
  DetectionResult,
  SeedPoint,
} from '@/types';
import { vectorAngle, isInBounds, generateId } from '@/utils/math';
import { getStreamlineStatus } from './streamline';

interface DetectionContext {
  formula: VectorFieldFormula;
}

function detectExplosion(
  point: StreamlinePoint,
  index: number,
  streamlineId: string,
  threshold: number
): AnomalyRecord | null {
  if (point.speed > threshold) {
    return {
      id: generateId('anomaly'),
      streamlineId,
      type: 'explosion',
      position: point.position,
      value: point.speed,
      threshold,
      description: `采样爆炸：速度模长 ${point.speed.toFixed(2)} 超过阈值 ${threshold}`,
      pointIndex: index,
    };
  }
  return null;
}

function detectDirectionFlip(
  currentPoint: StreamlinePoint,
  prevPoint: StreamlinePoint,
  index: number,
  streamlineId: string,
  threshold: number
): AnomalyRecord | null {
  const angle = vectorAngle(prevPoint.velocity, currentPoint.velocity);
  if (angle > threshold) {
    return {
      id: generateId('anomaly'),
      streamlineId,
      type: 'direction_flip',
      position: currentPoint.position,
      value: angle,
      threshold,
      description: `方向反转：速度方向变化 ${angle.toFixed(1)}° 超过阈值 ${threshold}°`,
      pointIndex: index,
    };
  }
  return null;
}

function detectOutOfBounds(
  point: StreamlinePoint,
  index: number,
  streamlineId: string,
  xRange: [number, number],
  yRange: [number, number],
  zRange: [number, number],
  threshold: number
): AnomalyRecord | null {
  const inBounds = isInBounds(point.position, xRange, yRange, zRange);
  const distance = Math.max(
    Math.max(0, xRange[0] - point.position[0], point.position[0] - xRange[1]),
    Math.max(0, yRange[0] - point.position[1], point.position[1] - yRange[1]),
    Math.max(0, zRange[0] - point.position[2], point.position[2] - zRange[1])
  );
  
  if (!inBounds || distance > threshold) {
    return {
      id: generateId('anomaly'),
      streamlineId,
      type: 'out_of_bounds',
      position: point.position,
      value: distance,
      threshold,
      description: `参数越界：位置 (${point.position.map(v => v.toFixed(2)).join(', ')}) 超出范围，偏离距离 ${distance.toFixed(2)}`,
      pointIndex: index,
    };
  }
  return null;
}

export function detectStreamlineAnomalies(
  streamline: Streamline,
  context: DetectionContext
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const { formula } = context;
  const { thresholds, params } = formula;
  
  for (let i = 0; i < streamline.points.length; i++) {
    const point = streamline.points[i];
    
    const explosion = detectExplosion(
      point,
      i,
      streamline.id,
      thresholds.explosion
    );
    if (explosion) {
      anomalies.push(explosion);
      break;
    }
    
    if (i > 0) {
      const prevPoint = streamline.points[i - 1];
      const flip = detectDirectionFlip(
        point,
        prevPoint,
        i,
        streamline.id,
        thresholds.directionFlip
      );
      if (flip) {
        anomalies.push(flip);
        break;
      }
    }
    
    const outOfBounds = detectOutOfBounds(
      point,
      i,
      streamline.id,
      params.xRange,
      params.yRange,
      params.zRange,
      thresholds.outOfBounds
    );
    if (outOfBounds) {
      anomalies.push(outOfBounds);
      break;
    }
  }
  
  return anomalies;
}

export function processStreamline(
  streamline: Streamline,
  context: DetectionContext
): Streamline {
  const anomalies = detectStreamlineAnomalies(streamline, context);
  const status = getStreamlineStatus({ ...streamline, anomalies });
  
  return {
    ...streamline,
    anomalies,
    status,
  };
}

export function processAllStreamlines(
  streamlines: Streamline[],
  context: DetectionContext,
  onProgress?: (completed: number, total: number) => void
): { streamlines: Streamline[]; anomalies: AnomalyRecord[] } {
  const processedStreamlines: Streamline[] = [];
  const allAnomalies: AnomalyRecord[] = [];
  
  streamlines.forEach((streamline, index) => {
    const processed = processStreamline(streamline, context);
    processedStreamlines.push(processed);
    allAnomalies.push(...processed.anomalies);
    
    if (onProgress) {
      onProgress(index + 1, streamlines.length);
    }
  });
  
  return {
    streamlines: processedStreamlines,
    anomalies: allAnomalies,
  };
}

export function calculateStatistics(
  streamlines: Streamline[]
): DetectionResult['statistics'] {
  const counts = {
    totalStreamlines: streamlines.length,
    normalCount: 0,
    explosionCount: 0,
    directionFlipCount: 0,
    outOfBoundsCount: 0,
  };
  
  streamlines.forEach((s) => {
    switch (s.status) {
      case 'normal':
        counts.normalCount++;
        break;
      case 'explosion':
        counts.explosionCount++;
        break;
      case 'direction_flip':
        counts.directionFlipCount++;
        break;
      case 'out_of_bounds':
        counts.outOfBoundsCount++;
        break;
    }
  });
  
  return counts;
}

export function createDetectionResult(
  formula: VectorFieldFormula,
  seedPoints: SeedPoint[],
  streamlines: Streamline[],
  anomalies: AnomalyRecord[],
  runNumber: number = 1,
  hasColorScale: boolean = false
): DetectionResult {
  return {
    id: generateId('result'),
    formulaId: formula.id,
    seedPoints,
    streamlines,
    anomalies,
    statistics: calculateStatistics(streamlines),
    runNumber,
    timestamp: new Date().toISOString(),
    isConsistent: true,
    hasColorScale,
  };
}

export function filterStreamlinesByAnomalyType(
  streamlines: Streamline[],
  types: AnomalyType[]
): Streamline[] {
  if (types.length === 0) return streamlines;
  return streamlines.filter((s) =>
    s.anomalies.some((a) => types.includes(a.type))
  );
}

export function filterStreamlinesBySpeedRange(
  streamlines: Streamline[],
  speedRange: [number, number]
): Streamline[] {
  return streamlines.filter((s) =>
    s.points.some((p) => p.speed >= speedRange[0] && p.speed <= speedRange[1])
  );
}

export function getAnomaliesByType(
  anomalies: AnomalyRecord[],
  type: AnomalyType
): AnomalyRecord[] {
  return anomalies.filter((a) => a.type === type);
}

export function getAnomalyDescription(type: AnomalyType): string {
  const descriptions: Record<AnomalyType, string> = {
    explosion: '采样爆炸：速度模长超过阈值，数值计算不稳定',
    direction_flip: '方向反转：连续两点速度方向夹角超过阈值',
    out_of_bounds: '参数越界：点位置超出预设的参数范围',
  };
  return descriptions[type];
}
