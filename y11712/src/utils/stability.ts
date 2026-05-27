import type {
  SimulationParams,
  StabilityResult,
  WarningItem,
  ErrorItem,
} from '../types/simulation';
import { computeThermalDiffusivity } from './heatTransfer';

export function checkStability(params: SimulationParams): StabilityResult {
  const alpha = computeThermalDiffusivity(params);
  const rx = (alpha * params.timeStep) / (params.gridStepX * params.gridStepX);
  const ry = (alpha * params.timeStep) / (params.gridStepY * params.gridStepY);
  const stabilityNumber = rx + ry;
  const maxStableTimeStep =
    0.5 / (alpha / (params.gridStepX * params.gridStepX) + alpha / (params.gridStepY * params.gridStepY));

  const warnings: WarningItem[] = [];
  const errors: ErrorItem[] = [];

  if (stabilityNumber > 0.5) {
    warnings.push({
      id: 'von-neumann',
      type: 'stability',
      message: '显式格式不稳定',
      detail: `Von Neumann稳定性条件不满足：rx + ry = ${stabilityNumber.toFixed(4)} > 0.5。计算结果将随时间发散。`,
      severity: 'high',
      suggestedAction: `建议将时间步长减小至 ${maxStableTimeStep.toExponential(2)} 秒以下，或减小网格步长。`,
    });
  } else if (stabilityNumber > 0.4) {
    warnings.push({
      id: 'von-neumann-warning',
      type: 'stability',
      message: '接近稳定性边界',
      detail: `rx + ry = ${stabilityNumber.toFixed(4)}，已接近0.5的稳定性上限。建议减小时间步长以确保数值稳定。`,
      severity: 'medium',
      suggestedAction: `安全时间步长应小于 ${maxStableTimeStep.toExponential(2)} 秒。`,
    });
  }

  const cellsX = params.plateLength / params.gridStepX;
  const cellsY = params.plateWidth / params.gridStepY;
  if (cellsX < 5 || cellsY < 5) {
    warnings.push({
      id: 'coarse-grid',
      type: 'grid',
      message: '网格过粗',
      detail: `当前网格密度：${cellsX.toFixed(1)} × ${cellsY.toFixed(1)} 个网格单元。网格过粗可能导致温度分布精度不足。`,
      severity: 'medium',
      suggestedAction: '建议减小网格步长，使每个方向至少有10个以上网格单元。',
    });
  }

  const boundaryTemps = [
    params.boundaryTempTop,
    params.boundaryTempBottom,
    params.boundaryTempLeft,
    params.boundaryTempRight,
  ];
  const allSame = boundaryTemps.every((t) => t === boundaryTemps[0]);
  if (allSame && boundaryTemps[0] === params.initialTemp) {
    warnings.push({
      id: 'uniform-boundary',
      type: 'boundary',
      message: '边界温度与初始温度相同',
      detail: '所有边界温度与初始温度一致，模拟过程中温度场不会发生任何变化。',
      severity: 'low',
      suggestedAction: '如需观察温度变化，请设置不同的边界温度或初始温度。',
    });
  }

  const maxBoundaryDiff = Math.max(...boundaryTemps) - Math.min(...boundaryTemps);
  if (maxBoundaryDiff > 500) {
    warnings.push({
      id: 'extreme-boundary',
      type: 'boundary',
      message: '边界温度差异过大',
      detail: `边界温度差异达到 ${maxBoundaryDiff.toFixed(1)}°C。极端温差可能导致温度梯度计算出现数值问题。`,
      severity: 'medium',
      suggestedAction: '请确认边界条件物理合理性，考虑是否需要分段设置。',
    });
  }

  if (params.plateLength <= 0 || params.plateWidth <= 0) {
    errors.push({
      id: 'invalid-dimension',
      type: 'invalid_param',
      message: '板材尺寸无效',
      detail: '板材长度和宽度必须为正值。',
    });
  }

  if (params.gridStepX <= 0 || params.gridStepY <= 0) {
    errors.push({
      id: 'invalid-grid',
      type: 'invalid_param',
      message: '网格步长无效',
      detail: '网格步长X和Y必须为正值。',
    });
  }

  if (params.timeStep <= 0) {
    errors.push({
      id: 'invalid-timestep',
      type: 'invalid_param',
      message: '时间步长无效',
      detail: '时间步长必须为正值。',
    });
  }

  if (params.gridStepX > params.plateLength) {
    errors.push({
      id: 'grid-exceeds-length',
      type: 'invalid_param',
      message: '网格步长超出板材长度',
      detail: '网格步长X不能大于板材长度。',
    });
  }

  if (params.gridStepY > params.plateWidth) {
    errors.push({
      id: 'grid-exceeds-width',
      type: 'invalid_param',
      message: '网格步长超出板材宽度',
      detail: '网格步长Y不能大于板材宽度。',
    });
  }

  if (params.thermalConductivity <= 0 || params.specificHeat <= 0 || params.density <= 0) {
    errors.push({
      id: 'invalid-material',
      type: 'invalid_param',
      message: '材料参数无效',
      detail: '导热系数、比热容和密度必须为正值。',
    });
  }

  return {
    isStable: stabilityNumber <= 0.5 && errors.length === 0,
    alpha,
    rx,
    ry,
    stabilityNumber,
    maxStableTimeStep,
    warnings,
    errors,
  };
}

export function autoCorrectTimeStep(params: SimulationParams): {
  corrected: boolean;
  originalTimeStep: number;
  correctedTimeStep: number;
} {
  const alpha = computeThermalDiffusivity(params);
  const maxStable =
    0.5 / (alpha / (params.gridStepX * params.gridStepX) + alpha / (params.gridStepY * params.gridStepY));

  if (params.timeStep > maxStable) {
    const safeStep = maxStable * 0.8;
    return {
      corrected: true,
      originalTimeStep: params.timeStep,
      correctedTimeStep: safeStep,
    };
  }

  return {
    corrected: false,
    originalTimeStep: params.timeStep,
    correctedTimeStep: params.timeStep,
  };
}
