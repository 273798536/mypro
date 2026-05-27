import type { MediumLayer, RayPath, RaySegment } from '@/types';

const DEG_TO_RAD = Math.PI / 180;
const MAX_ITERATIONS = 100;
const TOLERANCE = 0.01;

export function findLayerAtDepth(depth: number, layers: MediumLayer[]): MediumLayer | null {
  return layers.find(l => depth >= l.topDepth && depth < l.bottomDepth) || null;
}

export function getVelocity(layer: MediumLayer, waveType: 'P' | 'S'): number {
  return waveType === 'P' ? layer.pVelocity : layer.sVelocity;
}

interface RayTraceResult {
  points: [number, number][];
  totalTime: number;
  totalHorizontalDistance: number;
  isValid: boolean;
  errors: string[];
  segments: RaySegment[];
}

function traceRayWithParameter(
  p: number,
  epicenterDepth: number,
  epicenterX: number,
  layers: MediumLayer[],
  waveType: 'P' | 'S',
  direction: 'up' | 'down' = 'up'
): RayTraceResult {
  const points: [number, number][] = [[epicenterX, epicenterDepth]];
  let totalTime = 0;
  let totalHDist = 0;
  const errors: string[] = [];
  const segments: RaySegment[] = [];
  let currentDepth = epicenterDepth;
  let currentX = epicenterX;
  let directionSign = direction === 'up' ? -1 : 1;

  const epicenterLayer = findLayerAtDepth(epicenterDepth, layers);
  if (!epicenterLayer) {
    return { points, totalTime: 0, totalHorizontalDistance: 0, isValid: false, errors: ['震源不在任何层内'], segments: [] };
  }

  const v0 = getVelocity(epicenterLayer, waveType);
  if (v0 <= 0) {
    return { points, totalTime: 0, totalHorizontalDistance: 0, isValid: false, errors: [`震源所在层${waveType}波速度无效: ${v0}`], segments: [] };
  }

  const sortedLayers = [...layers].sort((a, b) => a.topDepth - b.topDepth);
  const epicenterLayerIndex = sortedLayers.indexOf(epicenterLayer);

  if (direction === 'up') {
    for (let i = epicenterLayerIndex; i >= 0; i--) {
      const layer = sortedLayers[i];
      const v = getVelocity(layer, waveType);

      if (v <= 0) {
        errors.push(`第${i + 1}层${waveType}波速度为零或负: ${v}`);
        return { points, totalTime, totalHorizontalDistance: totalHDist, isValid: false, errors, segments };
      }

      const sinTheta = p * v;
      if (Math.abs(sinTheta) >= 1) {
        break;
      }

      const cosTheta = Math.sqrt(1 - sinTheta * sinTheta);
      const tanTheta = sinTheta / cosTheta;

      let h: number;
      if (i === epicenterLayerIndex) {
        h = epicenterDepth - layer.topDepth;
      } else {
        h = layer.bottomDepth - layer.topDepth;
      }

      if (h < 0) h = 0;

      const dx = h * tanTheta;
      const dt = h / (v * cosTheta);

      const nextDepth = currentDepth - h;
      const nextX = currentX + dx;

      segments.push({
        start: [currentX, -currentDepth, 0],
        end: [nextX, -nextDepth, 0],
        layerId: layer.id,
        waveType,
        velocity: v,
        distance: Math.sqrt(dx * dx + h * h),
        travelTime: dt,
      });

      points.push([nextX, nextDepth]);
      totalTime += dt;
      totalHDist += dx;
      currentDepth = nextDepth;
      currentX = nextX;

      if (currentDepth <= 0) break;
    }
  } else {
    for (let i = epicenterLayerIndex; i < sortedLayers.length; i++) {
      const layer = sortedLayers[i];
      const v = getVelocity(layer, waveType);

      if (v <= 0) {
        errors.push(`第${i + 1}层${waveType}波速度为零或负: ${v}`);
        break;
      }

      const sinTheta = p * v;
      if (Math.abs(sinTheta) >= 1) {
        break;
      }

      const cosTheta = Math.sqrt(1 - sinTheta * sinTheta);
      const tanTheta = sinTheta / cosTheta;

      let h: number;
      if (i === epicenterLayerIndex) {
        h = layer.bottomDepth - epicenterDepth;
      } else {
        h = layer.bottomDepth - layer.topDepth;
      }

      if (h < 0) h = 0;

      const dx = h * tanTheta;
      const dt = h / (v * cosTheta);

      const nextDepth = currentDepth + h;
      const nextX = currentX + dx;

      segments.push({
        start: [currentX, -currentDepth, 0],
        end: [nextX, -nextDepth, 0],
        layerId: layer.id,
        waveType,
        velocity: v,
        distance: Math.sqrt(dx * dx + h * h),
        travelTime: dt,
      });

      points.push([nextX, nextDepth]);
      totalTime += dt;
      totalHDist += dx;
      currentDepth = nextDepth;
      currentX = nextX;
    }
  }

  return {
    points,
    totalTime,
    totalHorizontalDistance: totalHDist,
    isValid: errors.length === 0,
    errors,
    segments,
  };
}

export function computeRayPathToStation(
  stationX: number,
  stationDepth: number,
  epicenterDepth: number,
  epicenterX: number,
  layers: MediumLayer[],
  waveType: 'P' | 'S'
): RayPath {
  const targetDistance = Math.abs(stationX - epicenterX);
  const direction = stationX >= epicenterX ? 1 : -1;

  const epicenterLayer = findLayerAtDepth(epicenterDepth, layers);
  if (!epicenterLayer) {
    return {
      waveType,
      stationId: '',
      segments: [],
      totalDistance: 0,
      travelTime: 0,
      isValid: false,
      validationErrors: ['震源不在任何层内'],
    };
  }

  const v0 = getVelocity(epicenterLayer, waveType);
  if (v0 <= 0) {
    return {
      waveType,
      stationId: '',
      segments: [],
      totalDistance: 0,
      travelTime: 0,
      isValid: false,
      validationErrors: [`震源所在层${waveType}波速度无效`],
    };
  }

  const sortedLayers = [...layers].sort((a, b) => a.topDepth - b.bottomDepth);
  const maxV = Math.max(
    ...sortedLayers.map(l => Math.max(Math.abs(getVelocity(l, waveType)), 0.001))
  );
  const pMax = 0.999 / maxV;

  let pLow = 0;
  let pHigh = pMax;
  let bestResult: RayTraceResult | null = null;

  const resultAtZero = traceRayWithParameter(0, epicenterDepth, epicenterX, layers, waveType, 'up');
  const distAtZero = resultAtZero.totalHorizontalDistance;

  if (targetDistance <= distAtZero + TOLERANCE) {
    const segs = resultAtZero.segments.map(s => ({
      ...s,
      start: [direction * s.start[0], s.start[1], s.start[2]] as [number, number, number],
      end: [direction * s.end[0], s.end[1], s.end[2]] as [number, number, number],
    }));
    return {
      waveType,
      stationId: '',
      segments: segs,
      totalDistance: resultAtZero.segments.reduce((sum, s) => sum + s.distance, 0),
      travelTime: resultAtZero.totalTime,
      isValid: resultAtZero.isValid,
      validationErrors: resultAtZero.errors,
    };
  }

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const pMid = (pLow + pHigh) / 2;
    const result = traceRayWithParameter(pMid, epicenterDepth, epicenterX, layers, waveType, 'up');

    if (!result.isValid && result.points.length <= 1) {
      pHigh = pMid;
      continue;
    }

    bestResult = result;

    if (Math.abs(result.totalHorizontalDistance - targetDistance) < TOLERANCE) {
      break;
    }

    if (result.totalHorizontalDistance < targetDistance) {
      pLow = pMid;
    } else {
      pHigh = pMid;
    }
  }

  if (!bestResult) {
    bestResult = traceRayWithParameter(pMax * 0.5, epicenterDepth, epicenterX, layers, waveType, 'up');
  }

  const adjustedSegments = bestResult.segments.map(s => ({
    ...s,
    start: [epicenterX + direction * (s.start[0] - epicenterX), s.start[1], s.start[2]] as [number, number, number],
    end: [epicenterX + direction * (s.end[0] - epicenterX), s.end[1], s.end[2]] as [number, number, number],
  }));

  return {
    waveType,
    stationId: '',
    segments: adjustedSegments,
    totalDistance: bestResult.segments.reduce((sum, s) => sum + s.distance, 0),
    travelTime: bestResult.totalTime,
    isValid: bestResult.isValid,
    validationErrors: bestResult.errors,
  };
}

export function computeTravelTimes(
  epicenterDepth: number,
  epicenterX: number,
  stationX: number,
  layers: MediumLayer[],
  waveType: 'P' | 'S'
): number {
  const rayPath = computeRayPathToStation(stationX, 0, epicenterDepth, epicenterX, layers, waveType);
  return rayPath.travelTime;
}

export function computeWavefrontPoints(
  time: number,
  epicenterDepth: number,
  epicenterX: number,
  layers: MediumLayer[],
  waveType: 'P' | 'S',
  numRays: number = 36
): [number, number, number][] {
  const points: [number, number, number][] = [];
  const sortedLayers = [...layers].sort((a, b) => a.topDepth - b.bottomDepth);
  const epicenterLayer = findLayerAtDepth(epicenterDepth, layers);

  if (!epicenterLayer) return points;

  const v0 = getVelocity(epicenterLayer, waveType);
  if (v0 <= 0) return points;

  const maxV = Math.max(...sortedLayers.map(l => Math.max(Math.abs(getVelocity(l, waveType)), 0.001)));
  const pMax = 0.999 / maxV;

  for (let i = 0; i < numRays; i++) {
    const p = (i / (numRays - 1)) * pMax * 0.95;
    const isRightSide = i < numRays / 2;
    const dir = isRightSide ? 1 : -1;

    let currentDepth = epicenterDepth;
    let currentX = epicenterX;
    let remainingTime = time;

    const epicenterLayerIdx = sortedLayers.indexOf(epicenterLayer);

    for (let li = epicenterLayerIdx; li >= 0 && remainingTime > 0; li--) {
      const layer = sortedLayers[li];
      const v = getVelocity(layer, waveType);
      if (v <= 0) break;

      const sinTheta = p * v;
      if (Math.abs(sinTheta) >= 1) break;

      const cosTheta = Math.sqrt(1 - sinTheta * sinTheta);
      const tanTheta = sinTheta / cosTheta;

      let h: number;
      if (li === epicenterLayerIdx) {
        h = currentDepth - layer.topDepth;
      } else {
        h = layer.bottomDepth - layer.topDepth;
      }
      if (h < 0) h = 0;

      const timeToTraverse = h / (v * cosTheta);

      if (remainingTime <= timeToTraverse) {
        const distTraveled = v * remainingTime;
        const verticalDist = distTraveled * cosTheta;
        const horizontalDist = distTraveled * sinTheta;
        currentDepth -= verticalDist;
        currentX += dir * horizontalDist;
        remainingTime = 0;
        break;
      }

      remainingTime -= timeToTraverse;
      currentDepth -= h;
      currentX += dir * h * tanTheta;

      if (currentDepth <= 0) break;
    }

    if (currentDepth < 0) currentDepth = 0;
    points.push([currentX, -currentDepth, 0]);
  }

  return points;
}

export function computeTravelTimeCurve(
  epicenterDepth: number,
  epicenterX: number,
  layers: MediumLayer[],
  waveType: 'P' | 'S',
  maxDistance: number = 300,
  numPoints: number = 30
): { distance: number; time: number; isValid: boolean }[] {
  const curve: { distance: number; time: number; isValid: boolean }[] = [];

  for (let i = 1; i <= numPoints; i++) {
    const dist = (i / numPoints) * maxDistance;
    const stationX = epicenterX + dist;
    const rayPath = computeRayPathToStation(stationX, 0, epicenterDepth, epicenterX, layers, waveType);
    curve.push({
      distance: dist,
      time: rayPath.travelTime,
      isValid: rayPath.isValid,
    });
  }

  return curve;
}
