import type { Experiment, CalculationResult, TemperaturePoint } from '@/types';
import { bestFit, type FitResult } from './curveFitting';

export interface ThermalConductivityResult {
  thermalConductivity: number;
  fitResult: FitResult;
  calculationTrace: string;
}

export function calculateThermalConductivity(
  experiment: Experiment
): ThermalConductivityResult | null {
  const { thickness, boundaryTemp, temperaturePoints, materialId } = experiment;

  if (thickness == null || boundaryTemp == null || temperaturePoints.length < 3) {
    return null;
  }

  const sortedPoints = [...temperaturePoints].sort((a, b) => a.time - b.time);
  const fitResult = bestFit(sortedPoints);

  if (fitResult.rSquared < 0.5) {
    return {
      thermalConductivity: NaN,
      fitResult,
      calculationTrace: `拟合优度R²=${fitResult.rSquared.toFixed(4)} < 0.5，数据质量不足`,
    };
  }

  const initialTemp = sortedPoints[0].temperature;
  const deltaT = boundaryTemp - initialTemp;

  if (deltaT <= 0) {
    return {
      thermalConductivity: NaN,
      fitResult,
      calculationTrace: `边界温度(${boundaryTemp}°C) ≤ 初始温度(${initialTemp}°C)，无法计算`,
    };
  }

  let thermalConductivity: number;
  let traceDetails: string;

  if (fitResult.parameters.length === 3) {
    const [T0, A, tau] = fitResult.parameters;
    const alpha = (thickness * thickness) / (3 * tau);
    const rhoCp = 1.5e6;
    thermalConductivity = alpha * rhoCp;

    traceDetails =
      `[来源] 材料=${materialId || '未知'}, 厚度=${thickness}m, 边界温度=${boundaryTemp}°C, 数据点=${sortedPoints.length}个 | ` +
      `[判断] 指数拟合 T(t)=${T0.toFixed(2)}+${A.toFixed(2)}(1-e^(-t/${tau.toFixed(2)})), R²=${fitResult.rSquared.toFixed(4)} | ` +
      `[结果] 热扩散率α=${alpha.toExponential(4)} m²/s, 导热率λ=${thermalConductivity.toFixed(4)} W/(m·K)`;
  } else {
    const [intercept, slope] = fitResult.parameters;
    const dTdx = deltaT / thickness;
    const k = slope * 1000;
    thermalConductivity = k / dTdx;

    traceDetails =
      `[来源] 材料=${materialId || '未知'}, 厚度=${thickness}m, 边界温度=${boundaryTemp}°C, 数据点=${sortedPoints.length}个 | ` +
      `[判断] 线性拟合 T(t)=${intercept.toFixed(2)}+${slope.toFixed(4)}t, R²=${fitResult.rSquared.toFixed(4)} | ` +
      `[结果] 升温速率=${slope.toFixed(4)}°C/s, 导热率λ=${thermalConductivity.toFixed(4)} W/(m·K)`;
  }

  return {
    thermalConductivity,
    fitResult,
    calculationTrace: traceDetails,
  };
}

export function createCalculationResult(
  experiment: Experiment,
  tcResult: ThermalConductivityResult
): CalculationResult {
  return {
    id: `result-${experiment.id}-${Date.now()}`,
    experimentId: experiment.id,
    thermalConductivity: tcResult.thermalConductivity,
    rSquared: tcResult.fitResult.rSquared,
    fitEquation: tcResult.fitResult.equation,
    fitParameters: tcResult.fitResult.parameters,
    calculationTrace: tcResult.calculationTrace,
    calculatedAt: new Date().toISOString(),
    fitPoints: tcResult.fitResult.fitPoints,
  };
}

export function calculateBatch(
  experiments: Experiment[],
  onProgress?: (current: number, total: number) => void
): {
  results: CalculationResult[];
  updatedExperiments: Experiment[];
} {
  const results: CalculationResult[] = [];
  const updatedExperiments: Experiment[] = [];

  experiments.forEach((exp, index) => {
    if (exp.isLocked) {
      updatedExperiments.push(exp);
      return;
    }

    const tcResult = calculateThermalConductivity(exp);

    if (tcResult) {
      const result = createCalculationResult(exp, tcResult);
      results.push(result);

      const newStatus =
        tcResult.fitResult.rSquared < 0.95 || isNaN(tcResult.thermalConductivity)
          ? 'anomaly'
          : 'normal';

      updatedExperiments.push({
        ...exp,
        status: newStatus,
        isLocked: true,
        updatedAt: new Date().toISOString(),
      });
    } else {
      updatedExperiments.push({
        ...exp,
        status: 'pending',
        updatedAt: new Date().toISOString(),
      });
    }

    if (onProgress) {
      onProgress(index + 1, experiments.length);
    }
  });

  return { results, updatedExperiments };
}

export function getMaterialComparison(
  results: CalculationResult[],
  experiments: Experiment[]
): Array<{
  materialId: string;
  thermalConductivity: number;
  rSquared: number;
  experimentCount: number;
  avgTemperature: number;
}> {
  const materialMap = new Map<string, number[]>();

  results.forEach((result) => {
    const exp = experiments.find((e) => e.id === result.experimentId);
    if (!exp || !exp.materialId || isNaN(result.thermalConductivity)) return;

    if (!materialMap.has(exp.materialId)) {
      materialMap.set(exp.materialId, []);
    }
    materialMap.get(exp.materialId)!.push(result.thermalConductivity);
  });

  const comparison: Array<{
    materialId: string;
    thermalConductivity: number;
    rSquared: number;
    experimentCount: number;
    avgTemperature: number;
  }> = [];

  materialMap.forEach((values, materialId) => {
    const avgTc = values.reduce((a, b) => a + b, 0) / values.length;
    const relatedResults = results.filter(
      (r) =>
        experiments.find((e) => e.id === r.experimentId)?.materialId === materialId
    );
    const avgRSquared =
      relatedResults.reduce((a, b) => a + b.rSquared, 0) / relatedResults.length;

    let totalTemp = 0;
    let tempCount = 0;
    experiments
      .filter((e) => e.materialId === materialId)
      .forEach((e) => {
        e.temperaturePoints.forEach((p) => {
          totalTemp += p.temperature;
          tempCount++;
        });
      });

    comparison.push({
      materialId,
      thermalConductivity: avgTc,
      rSquared: avgRSquared,
      experimentCount: values.length,
      avgTemperature: tempCount > 0 ? totalTemp / tempCount : 0,
    });
  });

  return comparison.sort((a, b) => b.thermalConductivity - a.thermalConductivity);
}
