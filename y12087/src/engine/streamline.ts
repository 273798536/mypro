import type { VectorFieldFormula, SeedPoint, Streamline, StreamlinePoint, StreamlineStatus } from '@/types';
import { evaluateVectorFieldSafe } from './vectorField';
import { vectorMagnitude, generateId } from '@/utils/math';

export interface TraceOptions {
  stepSize: number;
  maxSteps: number;
  direction: 'forward' | 'backward' | 'both';
}

export const DEFAULT_TRACE_OPTIONS: TraceOptions = {
  stepSize: 0.05,
  maxSteps: 200,
  direction: 'forward',
};

function calculateCurvature(
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number]
): number {
  const v1: [number, number, number] = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const v2: [number, number, number] = [p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]];
  
  const mag1 = vectorMagnitude(v1);
  const mag2 = vectorMagnitude(v2);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cross: [number, number, number] = [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ];
  
  return vectorMagnitude(cross) / (mag1 * mag2);
}

function rk4Step(
  pos: [number, number, number],
  formula: VectorFieldFormula,
  h: number,
  direction: number = 1
): [number, number, number] {
  const k1 = evaluateVectorFieldSafe(pos[0], pos[1], pos[2], formula);
  const k2 = evaluateVectorFieldSafe(
    pos[0] + (h / 2) * direction * k1[0],
    pos[1] + (h / 2) * direction * k1[1],
    pos[2] + (h / 2) * direction * k1[2],
    formula
  );
  const k3 = evaluateVectorFieldSafe(
    pos[0] + (h / 2) * direction * k2[0],
    pos[1] + (h / 2) * direction * k2[1],
    pos[2] + (h / 2) * direction * k2[2],
    formula
  );
  const k4 = evaluateVectorFieldSafe(
    pos[0] + h * direction * k3[0],
    pos[1] + h * direction * k3[1],
    pos[2] + h * direction * k3[2],
    formula
  );
  
  return [
    pos[0] + (h / 6) * direction * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    pos[1] + (h / 6) * direction * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    pos[2] + (h / 6) * direction * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ];
}

function traceDirection(
  startPos: [number, number, number],
  formula: VectorFieldFormula,
  options: TraceOptions,
  direction: number
): StreamlinePoint[] {
  const points: StreamlinePoint[] = [];
  let currentPos = [...startPos] as [number, number, number];
  
  for (let i = 0; i < options.maxSteps; i++) {
    const velocity = evaluateVectorFieldSafe(currentPos[0], currentPos[1], currentPos[2], formula);
    const speed = vectorMagnitude(velocity);
    
    const prevPos = points.length > 0 ? points[points.length - 1].position : currentPos;
    const prevPrevPos = points.length > 1 ? points[points.length - 2].position : prevPos;
    
    const curvature = points.length >= 2 
      ? calculateCurvature(prevPrevPos, prevPos, currentPos)
      : 0;
    
    points.push({
      position: [...currentPos] as [number, number, number],
      velocity: [...velocity] as [number, number, number],
      speed,
      curvature,
      timestamp: i * options.stepSize * direction,
    });
    
    const nextPos = rk4Step(currentPos, formula, options.stepSize, direction);
    
    if (vectorMagnitude([
      nextPos[0] - currentPos[0],
      nextPos[1] - currentPos[1],
      nextPos[2] - currentPos[2],
    ]) < 1e-6) {
      break;
    }
    
    currentPos = nextPos;
  }
  
  return points;
}

export function traceStreamline(
  seedPoint: SeedPoint,
  formula: VectorFieldFormula,
  options: Partial<TraceOptions> = {}
): Streamline {
  const mergedOptions = { ...DEFAULT_TRACE_OPTIONS, ...options };
  const startPos: [number, number, number] = [seedPoint.x, seedPoint.y, seedPoint.z];
  
  let points: StreamlinePoint[] = [];
  
  if (mergedOptions.direction === 'forward' || mergedOptions.direction === 'both') {
    const forwardPoints = traceDirection(startPos, formula, mergedOptions, 1);
    points = forwardPoints;
  }
  
  if (mergedOptions.direction === 'backward' || mergedOptions.direction === 'both') {
    const backwardPoints = traceDirection(startPos, formula, mergedOptions, -1);
    if (mergedOptions.direction === 'backward') {
      points = backwardPoints.reverse();
    } else {
      points = [...backwardPoints.reverse().slice(0, -1), ...points];
    }
  }
  
  return {
    id: generateId('streamline'),
    seedPointId: seedPoint.id,
    points,
    status: 'normal',
    anomalies: [],
  };
}

export function traceAllStreamlines(
  seedPoints: SeedPoint[],
  formula: VectorFieldFormula,
  options: Partial<TraceOptions> = {},
  onProgress?: (completed: number, total: number) => void
): Streamline[] {
  const streamlines: Streamline[] = [];
  
  seedPoints.forEach((seed, index) => {
    const streamline = traceStreamline(seed, formula, options);
    streamlines.push(streamline);
    
    if (onProgress) {
      onProgress(index + 1, seedPoints.length);
    }
  });
  
  return streamlines;
}

export function getStreamlineStatus(streamline: Streamline): StreamlineStatus {
  if (streamline.anomalies.length === 0) return 'normal';
  
  const priority: Record<StreamlineStatus, number> = {
    explosion: 4,
    direction_flip: 3,
    out_of_bounds: 2,
    normal: 1,
  };
  
  return streamline.anomalies.reduce((highest, anomaly) => {
    return priority[anomaly.type] > priority[highest] ? anomaly.type : highest;
  }, 'normal' as StreamlineStatus);
}
