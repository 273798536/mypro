import type { SimulationParams, GridSize } from '../types/simulation';

export function computeGridSize(params: SimulationParams): GridSize {
  const nx = Math.max(2, Math.floor(params.plateLength / params.gridStepX) + 1);
  const ny = Math.max(2, Math.floor(params.plateWidth / params.gridStepY) + 1);
  const nt = Math.max(2, Math.floor(params.totalTime / params.timeStep) + 1);
  return { nx, ny, nt };
}

export function computeThermalDiffusivity(params: SimulationParams): number {
  return params.thermalConductivity / (params.density * params.specificHeat);
}

export function initializeTemperatureField(
  params: SimulationParams,
  grid: GridSize
): number[][][] {
  const { nx, ny, nt } = grid;
  const field: number[][][] = [];

  for (let t = 0; t < nt; t++) {
    const slice: number[][] = [];
    for (let j = 0; j < ny; j++) {
      const row: number[] = [];
      for (let i = 0; i < nx; i++) {
        row.push(params.initialTemp);
      }
      slice.push(row);
    }
    field.push(slice);
  }

  applyBoundaryConditions(field[0], params, grid);

  return field;
}

export function applyBoundaryConditions(
  slice: number[][],
  params: SimulationParams,
  grid: GridSize
): void {
  const { nx, ny } = grid;

  for (let i = 0; i < nx; i++) {
    slice[0][i] = params.boundaryTempTop;
    slice[ny - 1][i] = params.boundaryTempBottom;
  }

  for (let j = 0; j < ny; j++) {
    slice[j][0] = params.boundaryTempLeft;
    slice[j][nx - 1] = params.boundaryTempRight;
  }
}

export function runExplicitEuler(
  params: SimulationParams,
  grid: GridSize,
  field: number[][][],
  onProgress?: (step: number, total: number) => void
): void {
  const { nx, ny, nt } = grid;
  const alpha = computeThermalDiffusivity(params);
  const rx = (alpha * params.timeStep) / (params.gridStepX * params.gridStepX);
  const ry = (alpha * params.timeStep) / (params.gridStepY * params.gridStepY);

  for (let t = 0; t < nt - 1; t++) {
    const current = field[t];
    const next = field[t + 1];

    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const laplacianX =
          rx * (current[j][i + 1] - 2 * current[j][i] + current[j][i - 1]);
        const laplacianY =
          ry * (current[j + 1][i] - 2 * current[j][i] + current[j - 1][i]);
        next[j][i] = current[j][i] + laplacianX + laplacianY;
      }
    }

    applyBoundaryConditions(next, params, grid);

    if (onProgress && t % 10 === 0) {
      onProgress(t + 1, nt);
    }
  }

  if (onProgress) {
    onProgress(nt, nt);
  }
}

export function computeGradient(
  field: number[][],
  i: number,
  j: number,
  grid: GridSize,
  params: SimulationParams
): { gradX: number; gradY: number; magnitude: number } {
  const { nx, ny } = grid;
  let gradX = 0;
  let gradY = 0;

  if (i > 0 && i < nx - 1) {
    gradX = (field[j][i + 1] - field[j][i - 1]) / (2 * params.gridStepX);
  } else if (i === 0) {
    gradX = (field[j][i + 1] - field[j][i]) / params.gridStepX;
  } else {
    gradX = (field[j][i] - field[j][i - 1]) / params.gridStepX;
  }

  if (j > 0 && j < ny - 1) {
    gradY = (field[j + 1][i] - field[j - 1][i]) / (2 * params.gridStepY);
  } else if (j === 0) {
    gradY = (field[j + 1][i] - field[j][i]) / params.gridStepY;
  } else {
    gradY = (field[j][i] - field[j - 1][i]) / params.gridStepY;
  }

  return {
    gradX,
    gradY,
    magnitude: Math.sqrt(gradX * gradX + gradY * gradY),
  };
}

export function computeResultStats(
  field: number[][][],
  grid: GridSize
): { maxTemp: number; minTemp: number; avgTemp: number } {
  const finalStep = field[grid.nt - 1];
  let maxTemp = -Infinity;
  let minTemp = Infinity;
  let sum = 0;
  let count = 0;

  for (let j = 0; j < grid.ny; j++) {
    for (let i = 0; i < grid.nx; i++) {
      const t = finalStep[j][i];
      maxTemp = Math.max(maxTemp, t);
      minTemp = Math.min(minTemp, t);
      sum += t;
      count++;
    }
  }

  return {
    maxTemp,
    minTemp,
    avgTemp: sum / count,
  };
}

export function computeMaxGradient(
  field: number[][],
  grid: GridSize,
  params: SimulationParams
): number {
  let maxGrad = 0;

  for (let j = 0; j < grid.ny; j++) {
    for (let i = 0; i < grid.nx; i++) {
      const grad = computeGradient(field, i, j, grid, params);
      maxGrad = Math.max(maxGrad, grad.magnitude);
    }
  }

  return maxGrad;
}
