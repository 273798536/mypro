import type { RCParams, ParameterBounds, LMFitOptions, FittingResult, Alert } from '../types';
import { rcModelVoltage, jacobianRC } from './rcModel';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const calculateResiduals = (
  times: number[],
  voltages: number[],
  currents: number[],
  params: RCParams
): number[] => {
  return times.map((t, i) => voltages[i] - rcModelVoltage(t, currents[i], params));
};

const calculateChiSquared = (residuals: number[]): number => {
  return residuals.reduce((sum, r) => sum + r * r, 0);
};

const calculateRSquared = (voltages: number[], residuals: number[]): number => {
  const meanVoltage = voltages.reduce((sum, v) => sum + v, 0) / voltages.length;
  const totalSumSquares = voltages.reduce((sum, v) => sum + Math.pow(v - meanVoltage, 2), 0);
  const residualSumSquares = residuals.reduce((sum, r) => sum + r * r, 0);
  return 1 - residualSumSquares / totalSumSquares;
};

const calculateRMSE = (residuals: number[]): number => {
  const meanSquaredError = residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length;
  return Math.sqrt(meanSquaredError);
};

const matrixMultiply = (A: number[][], B: number[][]): number[][] => {
  const result: number[][] = [];
  for (let i = 0; i < A.length; i++) {
    result[i] = [];
    for (let j = 0; j < B[0].length; j++) {
      result[i][j] = 0;
      for (let k = 0; k < A[0].length; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
};

const matrixTranspose = (A: number[][]): number[][] => {
  return A[0].map((_, colIndex) => A.map(row => row[colIndex]));
};

const solveLinearSystem = (A: number[][], b: number[]): number[] | null => {
  const n = A.length;
  const augmented: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

    const pivot = augmented[col][col];
    if (Math.abs(pivot) < 1e-15) return null;

    for (let j = col; j <= n; j++) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row !== col && Math.abs(augmented[row][col]) > 1e-15) {
        const factor = augmented[row][col];
        for (let j = col; j <= n; j++) {
          augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }
  }

  return augmented.map(row => row[n]);
};

export const lmFitRC = (
  times: number[],
  voltages: number[],
  currents: number[],
  initialParams: RCParams,
  bounds: ParameterBounds,
  options: LMFitOptions = {}
): FittingResult => {
  const {
    maxIterations = 100,
    tolerance = 1e-6,
    lambda = 1e-3,
    lambdaMultiplier = 10,
    divergenceThreshold = 3
  } = options;

  const alerts: Alert[] = [];
  let params = { ...initialParams };
  let residuals = calculateResiduals(times, voltages, currents, params);
  let chiSquared = calculateChiSquared(residuals);
  let prevChiSquared = chiSquared;
  let currentLambda = lambda;
  let converged = false;
  let iterations = 0;
  let divergenceCount = 0;
  let lastStableParams = { ...params };

  const paramNames: Array<keyof RCParams> = ['ocv', 'R0', 'R1', 'C1'];

  while (iterations < maxIterations && !converged) {
    iterations++;

    const jacobian: number[][] = times.map((t, i) => jacobianRC(t, currents[i], params));
    const Jt = matrixTranspose(jacobian);
    const JtJ = matrixMultiply(Jt, jacobian);

    const n = JtJ.length;
    const A: number[][] = JtJ.map((row, i) =>
      row.map((val, j) => val + (i === j ? currentLambda : 0) * JtJ[i][i])
    );

    const gradient: number[] = [];
    for (let i = 0; i < n; i++) {
      gradient[i] = 0;
      for (let k = 0; k < times.length; k++) {
        gradient[i] += jacobian[k][i] * residuals[k];
      }
    }

    const delta = solveLinearSystem(A, gradient);

    if (!delta) {
      currentLambda *= lambdaMultiplier;
      continue;
    }

    const newParams: RCParams = { ...params };
    paramNames.forEach((name, i) => {
      newParams[name] = params[name] + delta[i];
      newParams[name] = Math.max(bounds[name][0], Math.min(bounds[name][1], newParams[name]));
    });

    const newResiduals = calculateResiduals(times, voltages, currents, newParams);
    const newChiSquared = calculateChiSquared(newResiduals);

    if (newChiSquared < chiSquared) {
      prevChiSquared = chiSquared;
      params = newParams;
      residuals = newResiduals;
      chiSquared = newChiSquared;
      currentLambda /= lambdaMultiplier;
      divergenceCount = 0;
      lastStableParams = { ...params };

      if (Math.abs((prevChiSquared - chiSquared) / prevChiSquared) < tolerance) {
        converged = true;
      }
    } else {
      divergenceCount++;
      if (divergenceCount >= divergenceThreshold) {
        alerts.push({
          id: generateId(),
          category: 'parameter_divergence',
          severity: 'severe',
          message: `参数发散检测: 连续${divergenceThreshold}次迭代残差增大，已终止拟合，回退到上一次稳定参数`,
          timestamp: Date.now(),
          resolved: false
        });
        params = lastStableParams;
        residuals = calculateResiduals(times, voltages, currents, params);
        break;
      }
      currentLambda *= lambdaMultiplier;
    }
  }

  const rSquared = calculateRSquared(voltages, residuals);
  const rmse = calculateRMSE(residuals);

  return {
    fittedParams: params,
    residuals,
    rSquared,
    rmse,
    iterations,
    converged,
    alerts
  };
};
