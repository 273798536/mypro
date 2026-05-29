import type { WaveSource, Obstacle, Warning } from '../types';

export const GRID_WIDTH = 100;
export const GRID_HEIGHT = 100;
export const PHASE_MIN = 0;
export const PHASE_MAX = 2 * Math.PI;
export const FREQ_MIN = 0.5;
export const FREQ_MAX = 5;
export const AMP_MIN = 0.1;
export const AMP_MAX = 2.0;

export function createWaveGrid(width: number, height: number): Float32Array {
  return new Float32Array(width * height);
}

export function isPointInObstacle(
  x: number,
  y: number,
  obstacle: Obstacle
): boolean {
  const dx = x - obstacle.x;
  const dy = y - obstacle.y;

  if (obstacle.type === 'circle' && obstacle.radius) {
    return Math.sqrt(dx * dx + dy * dy) < obstacle.radius;
  }

  if (obstacle.type === 'rect' && obstacle.width && obstacle.height) {
    const halfW = obstacle.width / 2;
    const halfH = obstacle.height / 2;
    const rot = obstacle.rotation || 0;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return Math.abs(rx) < halfW && Math.abs(ry) < halfH;
  }

  if (obstacle.type === 'line') {
    const thickness = 2;
    return Math.abs(dy) < thickness;
  }

  return false;
}

export function calculateWaveStep(
  sources: WaveSource[],
  obstacles: Obstacle[],
  time: number,
  currentGrid: Float32Array,
  prevGrid: Float32Array,
  width: number,
  height: number
): Float32Array {
  const c = 1.0;
  const damping = 0.995;
  const nextGrid = new Float32Array(currentGrid.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      let inObstacle = false;
      for (const obs of obstacles) {
        if (isPointInObstacle(x, y, obs)) {
          inObstacle = true;
          break;
        }
      }

      if (inObstacle) {
        nextGrid[idx] = 0;
        continue;
      }

      const laplacian =
        currentGrid[idx - 1] +
        currentGrid[idx + 1] +
        currentGrid[idx - width] +
        currentGrid[idx + width] -
        4 * currentGrid[idx];

      nextGrid[idx] =
        (2 * currentGrid[idx] - prevGrid[idx] + c * c * laplacian) * damping;

      for (const source of sources) {
        if (!source.enabled) continue;

        const dist = Math.sqrt(
          Math.pow(x - source.x, 2) + Math.pow(y - source.y, 2)
        );

        const wave =
          source.amplitude *
          Math.sin(2 * Math.PI * source.frequency * time - dist + source.phase);

        const attenuation = Math.exp(-dist * 0.03);
        nextGrid[idx] += wave * attenuation;
      }
    }
  }

  for (let i = 0; i < width; i++) {
    nextGrid[i] = 0;
    nextGrid[(height - 1) * width + i] = 0;
  }
  for (let i = 0; i < height; i++) {
    nextGrid[i * width] = 0;
    nextGrid[i * width + width - 1] = 0;
  }

  return nextGrid;
}

export function detectPhaseOutOfBounds(sources: WaveSource[]): Warning[] {
  const warnings: Warning[] = [];

  for (const source of sources) {
    if (source.phase < PHASE_MIN || source.phase > PHASE_MAX) {
      warnings.push({
        id: `phase-${source.id}`,
        type: 'phase_out_of_bounds',
        severity: 'error',
        message: `波源 ${source.id.slice(0, 8)} 相位越界: ${source.phase.toFixed(2)} (应在 0-${(2 * Math.PI).toFixed(2)} 之间)`,
        location: { x: source.x, y: source.y },
        timestamp: Date.now(),
        dismissed: false,
      });
    }
  }

  return warnings;
}

export function detectWavePenetration(
  grid: Float32Array,
  obstacles: Obstacle[],
  width: number,
  height: number
): Warning[] {
  const warnings: Warning[] = [];

  for (const obs of obstacles) {
    let maxBehindWave = 0;
    let sampleCount = 0;

    for (let r = 5; r < 15; r++) {
      for (let angle = 0; angle < 360; angle += 15) {
        const rad = (angle * Math.PI) / 180;
        const checkX = Math.floor(obs.x + Math.cos(rad) * r);
        const checkY = Math.floor(obs.y + Math.sin(rad) * r);

        if (
          checkX >= 0 &&
          checkX < width &&
          checkY >= 0 &&
          checkY < height &&
          !isPointInObstacle(checkX, checkY, obs)
        ) {
          const idx = checkY * width + checkX;
          maxBehindWave = Math.max(maxBehindWave, Math.abs(grid[idx]));
          sampleCount++;
        }
      }
    }

    if (sampleCount > 0 && maxBehindWave > 0.5 && obs.absorption > 0.8) {
      warnings.push({
        id: `penetration-${obs.id}`,
        type: 'wave_penetration',
        severity: 'warning',
        message: `检测到波面穿透障碍物 ${obs.id.slice(0, 8)}，最大波高: ${maxBehindWave.toFixed(3)}`,
        location: { x: obs.x, y: obs.y },
        timestamp: Date.now(),
        dismissed: false,
      });
    }
  }

  return warnings;
}

export function detectSamplingStutter(frameTimes: number[]): Warning | null {
  if (frameTimes.length < 10) return null;

  const avgTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const stutterCount = frameTimes.filter((t) => t > avgTime * 2).length;

  if (stutterCount > 3) {
    return {
      id: 'stutter-sampling',
      type: 'sampling_stutter',
      severity: 'warning',
      message: `检测到 ${stutterCount} 次采样卡顿 (平均: ${avgTime.toFixed(1)}ms)，建议降低分辨率`,
      timestamp: Date.now(),
      dismissed: false,
    };
  }

  return null;
}

export function calculateComparisonDiff(
  grid1: Float32Array,
  grid2: Float32Array,
  width: number,
  height: number,
  threshold: number = 0.1
): { x: number; y: number; diff: number }[] {
  const diffs: { x: number; y: number; diff: number }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const diff = Math.abs(grid1[idx] - grid2[idx]);
      if (diff > threshold) {
        diffs.push({ x, y, diff });
      }
    }
  }

  return diffs;
}
