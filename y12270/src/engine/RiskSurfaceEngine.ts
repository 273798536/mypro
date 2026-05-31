import type { BondHolding, AnalysisParams, SurfacePoint } from '../types';
import { calculateDurations } from './DurationCalculator';

const GRID_SIZE = 30;

export interface SurfaceCalculationResult {
  surfaceData: SurfacePoint[][];
  outliers: SurfacePoint[];
  gridBounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
  };
}

export function calculateRiskSurface(
  holdings: BondHolding[],
  params: AnalysisParams
): SurfaceCalculationResult {
  const filtered = holdings.filter(h => {
    if (h.duration < params.durationRange[0] || h.duration > params.durationRange[1]) return false;
    if (h.yield < params.yieldRange[0] || h.yield > params.yieldRange[1]) return false;
    if (params.industries.length > 0 && !params.industries.includes(h.industry)) return false;
    if (h.weight !== null && h.weight < params.weightThreshold) return false;
    return true;
  });

  if (filtered.length === 0) {
    return {
      surfaceData: [],
      outliers: [],
      gridBounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 10, zMin: 0, zMax: 10 }
    };
  }

  const xMin = Math.min(...filtered.map(h => h.duration));
  const xMax = Math.max(...filtered.map(h => h.duration));
  const yMin = Math.min(...filtered.map(h => h.yield));
  const yMax = Math.max(...filtered.map(h => h.yield));

  const xStep = (xMax - xMin) / GRID_SIZE;
  const yStep = (yMax - yMin) / GRID_SIZE;

  const grid: { bonds: BondHolding[]; x: number; y: number }[][] = [];
  for (let i = 0; i <= GRID_SIZE; i++) {
    grid[i] = [];
    for (let j = 0; j <= GRID_SIZE; j++) {
      grid[i][j] = {
        bonds: [],
        x: xMin + i * xStep,
        y: yMin + j * yStep
      };
    }
  }

  for (const bond of filtered) {
    const i = Math.min(Math.floor((bond.duration - xMin) / xStep), GRID_SIZE);
    const j = Math.min(Math.floor((bond.yield - yMin) / yStep), GRID_SIZE);
    if (i >= 0 && i <= GRID_SIZE && j >= 0 && j <= GRID_SIZE) {
      grid[i][j].bonds.push(bond);
    }
  }

  const rawSurface: SurfacePoint[][] = [];
  for (let i = 0; i <= GRID_SIZE; i++) {
    rawSurface[i] = [];
    for (let j = 0; j <= GRID_SIZE; j++) {
      const cell = grid[i][j];
      const riskValue = calculateRiskValue(cell.bonds, holdings, params);
      rawSurface[i][j] = {
        x: cell.x,
        y: cell.y,
        z: riskValue,
        bondIds: cell.bonds.map(b => b.bondId),
        isOutlier: false
      };
    }
  }

  const smoothedSurface = applyGaussianSmoothing(rawSurface, params.surfaceSmoothing);
  const { surfaceWithOutliers, outliers } = detectAndMarkOutliers(smoothedSurface, params.showOutliers);

  const zValues = smoothedSurface.flat().map(p => p.z);
  const zMin = Math.min(...zValues);
  const zMax = Math.max(...zValues);

  return {
    surfaceData: params.showOutliers ? surfaceWithOutliers : smoothedSurface,
    outliers,
    gridBounds: { xMin, xMax, yMin, yMax, zMin, zMax }
  };
}

function calculateRiskValue(
  cellBonds: BondHolding[],
  allHoldings: BondHolding[],
  params: AnalysisParams
): number {
  if (cellBonds.length === 0) return 0;

  const { weightedDuration, byIndustry } = calculateDurations(allHoldings, params);
  
  const avgDuration = cellBonds.reduce((sum, b) => sum + b.duration, 0) / cellBonds.length;
  const avgYield = cellBonds.reduce((sum, b) => sum + b.yield, 0) / cellBonds.length;
  const totalWeight = cellBonds.reduce((sum, b) => sum + (b.weight ?? 0), 0);
  const count = cellBonds.length;

  const durationDeviation = Math.abs(avgDuration - weightedDuration) / Math.max(weightedDuration, 0.1);
  const yieldScore = avgYield / 10;
  const weightScore = totalWeight / 100;
  const concentrationScore = calculateConcentrationScore(cellBonds, byIndustry);
  const countScore = Math.min(count / 10, 1);

  const riskValue = (
    durationDeviation * 0.35 +
    (1 - yieldScore) * 0.2 +
    weightScore * 0.2 +
    concentrationScore * 0.15 +
    countScore * 0.1
  ) * 10;

  return Math.round(riskValue * 100) / 100;
}

function calculateConcentrationScore(
  bonds: BondHolding[],
  byIndustry: Record<string, { count: number }>
): number {
  if (bonds.length === 0) return 0;
  
  const industryCounts: Record<string, number> = {};
  for (const bond of bonds) {
    industryCounts[bond.industry] = (industryCounts[bond.industry] || 0) + 1;
  }
  
  const values = Object.values(industryCounts);
  const maxCount = Math.max(...values);
  const concentration = maxCount / bonds.length;
  
  return concentration;
}

function applyGaussianSmoothing(
  surface: SurfacePoint[][],
  sigma: number
): SurfacePoint[][] {
  if (sigma <= 0) return surface;
  
  const size = surface.length;
  const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
  const kernel = generateGaussianKernel(kernelSize, sigma);
  
  const smoothed: SurfacePoint[][] = [];
  
  for (let i = 0; i < size; i++) {
    smoothed[i] = [];
    for (let j = 0; j < size; j++) {
      let sumZ = 0;
      let sumWeight = 0;
      
      for (let ki = 0; ki < kernelSize; ki++) {
        for (let kj = 0; kj < kernelSize; kj++) {
          const si = i + ki - Math.floor(kernelSize / 2);
          const sj = j + kj - Math.floor(kernelSize / 2);
          
          if (si >= 0 && si < size && sj >= 0 && sj < size) {
            const weight = kernel[ki][kj];
            sumZ += surface[si][sj].z * weight;
            sumWeight += weight;
          }
        }
      }
      
      smoothed[i][j] = {
        ...surface[i][j],
        z: Math.round((sumZ / sumWeight) * 100) / 100
      };
    }
  }
  
  return smoothed;
}

function generateGaussianKernel(size: number, sigma: number): number[][] {
  const kernel: number[][] = [];
  const center = Math.floor(size / 2);
  let sum = 0;
  
  for (let i = 0; i < size; i++) {
    kernel[i] = [];
    for (let j = 0; j < size; j++) {
      const x = i - center;
      const y = j - center;
      const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      kernel[i][j] = value;
      sum += value;
    }
  }
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      kernel[i][j] /= sum;
    }
  }
  
  return kernel;
}

function detectAndMarkOutliers(
  surface: SurfacePoint[][],
  showOutliers: boolean
): { surfaceWithOutliers: SurfacePoint[][]; outliers: SurfacePoint[] } {
  const zValues = surface.flat().map(p => p.z);
  const q1 = quantile(zValues, 0.25);
  const q3 = quantile(zValues, 0.75);
  const iqr = q3 - q1;
  const upperBound = q3 + 1.5 * iqr;
  const lowerBound = q1 - 1.5 * iqr;

  const outliers: SurfacePoint[] = [];
  const surfaceWithOutliers = surface.map(row =>
    row.map(point => {
      if (point.z > upperBound || point.z < lowerBound) {
        const outlierPoint = { ...point, isOutlier: true };
        outliers.push(outlierPoint);
        return outlierPoint;
      }
      return point;
    })
  );

  return { surfaceWithOutliers, outliers };
}

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

export function getRiskColor(z: number, zMin: number, zMax: number): string {
  const normalized = zMax === zMin ? 0.5 : (z - zMin) / (zMax - zMin);
  
  const r = Math.round(30 + normalized * 180);
  const g = Math.round(64 - normalized * 44);
  const b = Math.round(175 - normalized * 125);
  
  return `rgb(${r}, ${g}, ${b})`;
}
