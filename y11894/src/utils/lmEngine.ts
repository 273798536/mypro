import type { FitModel, FitResult } from './types';

function computeResiduals(
  model: FitModel,
  params: number[],
  xData: number[],
  yData: number[]
): number[] {
  return xData.map((x, i) => yData[i] - model.fn(params, x));
}

function computeJacobian(
  model: FitModel,
  params: number[],
  xData: number[]
): number[][] {
  return xData.map((x) => model.jacobian(params, x));
}

function transpose(matrix: number[][]): number[][] {
  if (matrix.length === 0) return [];
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
}

function matMul(a: number[][], b: number[][]): number[][] {
  const aRows = a.length;
  const aCols = a[0].length;
  const bCols = b[0].length;
  const result: number[][] = Array.from({ length: aRows }, () => Array(bCols).fill(0));
  for (let i = 0; i < aRows; i++) {
    for (let j = 0; j < bCols; j++) {
      for (let k = 0; k < aCols; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

function matVecMul(a: number[][], v: number[]): number[] {
  return a.map((row) => row.reduce((sum, val, k) => sum + val * v[k], 0));
}

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-14) return null;

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }
  return x;
}

function sumOfSquares(residuals: number[]): number {
  return residuals.reduce((sum, r) => sum + r * r, 0);
}

function clampParams(
  params: number[],
  bounds: { lower: number; upper: number }[]
): number[] {
  return params.map((p, i) => {
    const lb = bounds[i]?.lower ?? -Infinity;
    const ub = bounds[i]?.upper ?? Infinity;
    return Math.max(lb, Math.min(ub, p));
  });
}

export interface LmOptions {
  maxIterations?: number;
  paramTolerance?: number;
  residualTolerance?: number;
  initialDamping?: number;
  divergeCount?: number;
  stallCount?: number;
}

export function levenbergMarquardt(
  model: FitModel,
  xData: number[],
  yData: number[],
  initialParams: number[],
  options: LmOptions = {}
): FitResult {
  const {
    maxIterations = 200,
    paramTolerance = 1e-8,
    residualTolerance = 1e-10,
    initialDamping = 0.001,
    divergeCount = 3,
    stallCount = 15,
  } = options;

  const n = xData.length;
  const p = initialParams.length;
  let params = [...initialParams];
  let lambda = initialDamping;
  const residualHistory: number[] = [];

  let residuals = computeResiduals(model, params, xData, yData);
  let currentSsr = sumOfSquares(residuals);
  if (!isFinite(currentSsr)) {
    return buildResult(false, params, model, xData, yData, 0, false, [currentSsr]);
  }
  const initialSsr = currentSsr;
  residualHistory.push(currentSsr);

  let consecutiveDivergence = 0;
  let stalledIterations = 0;
  let converged = false;
  let iter = 0;

  for (iter = 0; iter < maxIterations; iter++) {
    const J = computeJacobian(model, params, xData);
    const hasInvalid = J.some(row => row.some(v => !isFinite(v)));
    if (hasInvalid) {
      consecutiveDivergence++;
      if (consecutiveDivergence >= divergeCount) {
        return buildResult(false, params, model, xData, yData, iter + 1, false, residualHistory);
      }
      residualHistory.push(currentSsr);
      continue;
    }
    const Jt = transpose(J);
    const JtJ = matMul(Jt, J);
    const Jtr = matVecMul(Jt, residuals);

    let step: number[] | null = null;
    let newParams: number[] = [];
    let newSsr = Infinity;

    const dampingFactors = [lambda, lambda * 10, lambda * 100, lambda * 1000];
    for (const nu of dampingFactors) {
      const dampedJtJ = JtJ.map((row, i) =>
        row.map((val, j) => val + (i === j ? nu : 0))
      );
      step = solveLinearSystem(dampedJtJ, Jtr);
      if (!step) continue;

      newParams = clampParams(
        params.map((pi, i) => pi + (step?.[i] ?? 0)),
        model.paramBounds
      );
      const newResiduals = computeResiduals(model, newParams, xData, yData);
      newSsr = sumOfSquares(newResiduals);

      if (newSsr < currentSsr) break;
    }

    if (newSsr < currentSsr) {
      const improvement = (currentSsr - newSsr) / Math.max(currentSsr, 1e-20);
      if (improvement < 1e-6) {
        stalledIterations++;
      } else {
        stalledIterations = 0;
      }
      params = newParams;
      currentSsr = newSsr;
      residuals = computeResiduals(model, params, xData, yData);
      lambda = Math.max(lambda / 10, 1e-15);
      consecutiveDivergence = 0;
    } else {
      lambda *= 10;
      consecutiveDivergence++;
      stalledIterations++;
    }

    residualHistory.push(currentSsr);

    if (consecutiveDivergence >= divergeCount) {
      return buildResult(
        false,
        params,
        model,
        xData,
        yData,
        iter + 1,
        false,
        residualHistory
      );
    }

    if (stalledIterations >= stallCount && currentSsr > initialSsr * 0.01) {
      return buildResult(
        false,
        params,
        model,
        xData,
        yData,
        iter + 1,
        false,
        residualHistory
      );
    }

    const paramChange = step
      ? Math.max(...step.map((s) => Math.abs(s)))
      : Infinity;
    const ssrChange = residualHistory.length >= 2
      ? Math.abs(residualHistory[residualHistory.length - 2] - currentSsr)
      : Infinity;

    if (paramChange < paramTolerance || ssrChange < residualTolerance) {
      converged = true;
      return buildResult(
        true,
        params,
        model,
        xData,
        yData,
        iter + 1,
        converged,
        residualHistory
      );
    }
  }

  return buildResult(
    converged,
    params,
    model,
    xData,
    yData,
    maxIterations,
    converged,
    residualHistory
  );
}

function buildResult(
  success: boolean,
  params: number[],
  model: FitModel,
  xData: number[],
  yData: number[],
  iterations: number,
  converged: boolean,
  residualHistory: number[]
): FitResult {
  const n = xData.length;
  const p = params.length;
  const residuals = computeResiduals(model, params, xData, yData);
  const ssr = sumOfSquares(residuals);
  const rmse = Math.sqrt(ssr / n);

  const yMean = yData.reduce((a, b) => a + b, 0) / n;
  const totalSs = yData.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const rSquared = totalSs > 0 ? 1 - ssr / totalSs : 0;
  const adjustedRSquared =
    n > p ? 1 - ((1 - rSquared) * (n - 1)) / (n - p - 1) : rSquared;

  const J = computeJacobian(model, params, xData);
  const Jt = transpose(J);
  const JtJ = matMul(Jt, J);
  const covarianceDiag = n > p ? computeCovarianceDiagonal(JtJ, ssr, n, p) : params.map(() => 0);
  const standardErrors = covarianceDiag.map((v) => Math.sqrt(Math.max(0, v)));
  const confidenceIntervals: [number, number][] = params.map((param, i) => {
    const se = standardErrors[i];
    const tValue = 1.96;
    return [param - tValue * se, param + tValue * se];
  });

  return {
    success,
    parameters: params,
    standardErrors,
    confidenceIntervals,
    rSquared,
    adjustedRSquared,
    rmse,
    iterations,
    converged,
    residualHistory,
  };
}

function computeCovarianceDiagonal(
  JtJ: number[][],
  ssr: number,
  n: number,
  p: number
): number[] {
  const sigma2 = ssr / Math.max(n - p, 1);
  const inv = invertMatrix(JtJ);
  if (!inv) return Array(p).fill(0);
  return inv.map((row, i) => row[i] * sigma2);
}

function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length;
  const aug = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-14) return null;

    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  return aug.map((row) => row.slice(n));
}
