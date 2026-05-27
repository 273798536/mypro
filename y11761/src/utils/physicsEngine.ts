import { WaveParams, Obstacle, WaveHeightResult, WaveSource } from '@/types';

const TAU = Math.PI * 2;

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function normalizePhase(phase: number): number {
  let result = phase % TAU;
  if (result < 0) result += TAU;
  return result;
}

function singleWaveHeight(
  source: WaveSource,
  x: number,
  y: number,
  t: number,
  wavelength: number
): { height: number; phase: number } {
  const r = distance(x, y, source.x, source.y);
  const k = TAU / wavelength;
  const omega = TAU * source.frequency;
  const phase = normalizePhase(k * r - omega * t + source.phase);
  const height = source.amplitude * Math.sin(phase);
  return { height, phase };
}

function checkObstaclePenetration(
  x: number,
  y: number,
  obstacles: Obstacle[]
): { blocked: boolean; distanceToObstacle: number } {
  let minDist = Infinity;
  let blocked = false;

  for (const obstacle of obstacles) {
    const dx = x - obstacle.position.x;
    const dy = y - obstacle.position.y;
    const halfW = obstacle.size.width / 2;
    const halfH = obstacle.size.height / 2;

    const cos = Math.cos(-obstacle.rotation);
    const sin = Math.sin(-obstacle.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const clampedX = Math.max(-halfW, Math.min(halfW, localX));
    const clampedY = Math.max(-halfH, Math.min(halfH, localY));
    const dist = Math.sqrt((localX - clampedX) ** 2 + (localY - clampedY) ** 2);
    
    if (dist < minDist) {
      minDist = dist;
    }

    if (
      Math.abs(localX) <= halfW &&
      Math.abs(localY) <= halfH
    ) {
      if (obstacle.type === 'barrier' || obstacle.type === 'reflector') {
        blocked = true;
      } else if (obstacle.type === 'slit') {
        const slitWidth = obstacle.size.width * 0.3;
        if (Math.abs(localX) > slitWidth / 2) {
          blocked = true;
        }
      } else if (obstacle.type === 'double_slit') {
        const slitSeparation = obstacle.size.width * 0.25;
        const slitWidth = obstacle.size.width * 0.15;
        const inLeftSlit =
          Math.abs(Math.abs(localX) - slitSeparation) <= slitWidth / 2;
        if (!inLeftSlit) {
          blocked = true;
        }
      }
    }
  }

  return { blocked, distanceToObstacle: minDist };
}

export function calculateWaveHeight(
  x: number,
  y: number,
  t: number,
  params: WaveParams,
  obstacles: Obstacle[]
): WaveHeightResult {
  const source1 = singleWaveHeight(params.source1, x, y, t, params.wavelength);
  const source2 = singleWaveHeight(params.source2, x, y, t, params.wavelength);
  const { blocked } = checkObstaclePenetration(x, y, obstacles);

  let totalHeight = source1.height + source2.height;
  let totalAmplitude = params.source1.amplitude + params.source2.amplitude;

  if (blocked) {
    totalHeight *= 0.1;
    totalAmplitude *= 0.1;
  }

  const phaseDiff = Math.abs(source1.phase - source2.phase);
  const normalizedPhaseDiff = normalizePhase(phaseDiff);
  const avgPhase = (source1.phase + source2.phase) / 2;

  return {
    height: totalHeight,
    amplitude: Math.abs(totalAmplitude * Math.cos(normalizedPhaseDiff / 2)),
    phase: avgPhase,
    penetration: blocked,
  };
}

export function generateWaveGrid(
  gridSize: number,
  resolution: number,
  t: number,
  params: WaveParams,
  obstacles: Obstacle[]
): {
  heights: Float32Array;
  amplitudes: Float32Array;
  penetrations: boolean[];
} {
  const halfSize = gridSize / 2;
  const step = gridSize / (resolution - 1);
  const totalPoints = resolution * resolution;

  const heights = new Float32Array(totalPoints);
  const amplitudes = new Float32Array(totalPoints);
  const penetrations: boolean[] = new Array(totalPoints).fill(false);

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x = -halfSize + j * step;
      const y = -halfSize + i * step;
      const idx = i * resolution + j;

      const result = calculateWaveHeight(x, y, t, params, obstacles);
      heights[idx] = result.height;
      amplitudes[idx] = result.amplitude;
      penetrations[idx] = result.penetration;
    }
  }

  return { heights, amplitudes, penetrations };
}

export function getInterferenceContrast(amplitudes: Float32Array): {
  contrast: number; maxAmp: number; minAmp: number } {
  let maxAmp = -Infinity;
  let minAmp = Infinity;

  for (let i = 0; i < amplitudes.length; i++) {
    if (amplitudes[i] > maxAmp) maxAmp = amplitudes[i];
    if (amplitudes[i] < minAmp) minAmp = amplitudes[i];
  }

  const contrast = (maxAmp - minAmp) / (maxAmp + minAmp + 0.001);
  return { contrast, maxAmp, minAmp };
}

export function calculatePathDifference(
  x: number,
  y: number,
  params: WaveParams
): number {
  const dist1 = distance(x, y, params.source1.x, params.source1.y);
  const dist2 = distance(x, y, params.source2.x, params.source2.y);
  return Math.abs(dist1 - dist2);
}

export function isConstructiveInterference(
  pathDiff: number,
  wavelength: number
): 'constructive' | 'destructive' | 'intermediate' {
  const ratio = pathDiff / wavelength;
  const fractional = ratio - Math.floor(ratio);
  if (fractional < 0.1 || fractional > 0.9) return 'constructive';
  if (Math.abs(fractional - 0.5) < 0.1) return 'destructive';
  return 'intermediate';
}

export function calculateTheoreticalAmplitude(
  x: number,
  y: number,
  params: WaveParams
): number {
  const pathDiff = calculatePathDifference(x, y, params);
  const phaseDiff = (TAU * pathDiff) / params.wavelength;
  const phaseDiff2 = params.source1.phase - params.source2.phase;
  const totalPhaseDiff = phaseDiff + phaseDiff2;
  const interference = params.source1.amplitude +
    params.source2.amplitude * Math.cos(totalPhaseDiff);
  return Math.abs(interference);
}

export { normalizePhase };
