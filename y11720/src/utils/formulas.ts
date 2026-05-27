import { GRAVITY, REYNOLDS_THRESHOLDS } from './constants';
import { convertDiameter, convertFlowRate, convertLength, convertRoughness } from './units';
import type {
  CalculationParams,
  CalculationResult,
  CalculationStep,
  FlowRegime,
  Warning,
} from '../types';

export function calculateVelocity(
  flowRate: number,
  flowRateUnit: string,
  diameter: number,
  diameterUnit: string
): number {
  const Q = convertFlowRate(flowRate, flowRateUnit as any, 'm3_s');
  const D = convertDiameter(diameter, diameterUnit as any, 'm');
  const A = Math.PI * Math.pow(D / 2, 2);
  return Q / A;
}

export function calculateReynolds(
  velocity: number,
  diameter: number,
  diameterUnit: string,
  viscosity: number
): number {
  const D = convertDiameter(diameter, diameterUnit as any, 'm');
  return (velocity * D) / viscosity;
}

export function determineFlowRegime(reynolds: number): FlowRegime {
  if (reynolds < REYNOLDS_THRESHOLDS.LAMINAR_MAX) {
    return 'laminar';
  } else if (reynolds < REYNOLDS_THRESHOLDS.TRANSITIONAL_MAX) {
    return 'critical';
  }
  return 'turbulent';
}

export function calculateFrictionFactor(
  reynolds: number,
  roughness: number,
  roughnessUnit: string,
  diameter: number,
  diameterUnit: string
): number {
  const epsilon = convertRoughness(roughness, roughnessUnit as any, 'm');
  const D = convertDiameter(diameter, diameterUnit as any, 'm');
  const relativeRoughness = epsilon / D;

  if (reynolds < REYNOLDS_THRESHOLDS.LAMINAR_MAX) {
    return 64 / reynolds;
  }

  return colebrookWhite(reynolds, relativeRoughness);
}

function colebrookWhite(reynolds: number, relativeRoughness: number): number {
  let f = 0.02;
  const tolerance = 1e-8;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    const lhs = 1 / Math.sqrt(f);
    const rhs = -2 * Math.log10(relativeRoughness / 3.7 + 2.51 / (reynolds * Math.sqrt(f)));
    const error = Math.abs(lhs - rhs);

    if (error < tolerance) {
      break;
    }

    f = f * (rhs / lhs);
  }

  return f;
}

export function calculateHeadLoss(
  frictionFactor: number,
  pipeLength: number,
  pipeLengthUnit: string,
  diameter: number,
  diameterUnit: string,
  velocity: number
): number {
  const L = convertLength(pipeLength, pipeLengthUnit as any, 'm');
  const D = convertDiameter(diameter, diameterUnit as any, 'm');
  return frictionFactor * (L / D) * (Math.pow(velocity, 2) / (2 * GRAVITY));
}

export function calculateLocalLoss(
  valves: Array<{ count: number; kValue: number }>,
  velocity: number
): number {
  const totalK = valves.reduce((sum, valve) => sum + valve.count * valve.kValue, 0);
  return totalK * (Math.pow(velocity, 2) / (2 * GRAVITY));
}

export function calculateTotalPressureDrop(
  headLoss: number,
  localLoss: number,
  density: number
): number {
  return density * GRAVITY * (headLoss + localLoss);
}

export function detectWarnings(
  params: CalculationParams,
  reynolds: number,
  velocity: number
): Warning[] {
  const warnings: Warning[] = [];

  if (reynolds >= REYNOLDS_THRESHOLDS.LAMINAR_MAX && reynolds < REYNOLDS_THRESHOLDS.TRANSITIONAL_MAX) {
    warnings.push({
      type: 'reynolds_critical',
      severity: 'warning',
      message: `雷诺数 ${reynolds.toFixed(0)} 处于临界过渡区 (2300-4000)`,
      suggestion: '该区域流动不稳定，计算结果可能存在较大误差。建议调整参数使雷诺数避开此区间。',
    });
  }

  if (velocity > 3) {
    warnings.push({
      type: 'boundary',
      severity: 'warning',
      message: `流速 ${velocity.toFixed(2)} m/s 偏高`,
      suggestion: '高流速可能导致噪音和侵蚀问题。建议检查管径选型是否合理。',
    });
  }

  if (velocity < 0.3 && params.flowRate > 0) {
    warnings.push({
      type: 'boundary',
      severity: 'warning',
      message: `流速 ${velocity.toFixed(2)} m/s 偏低`,
      suggestion: '低流速可能导致沉积物堆积。建议检查流量或管径配置。',
    });
  }

  if (params.valves.length === 0) {
    warnings.push({
      type: 'valve_missing',
      severity: 'warning',
      message: '未配置任何阀门或管件',
      suggestion: '实际管路通常包含阀门、弯头、三通等管件。请确认是否需要添加局部阻力元件。',
    });
  }

  return warnings;
}

export function generateExplanation(
  _params: CalculationParams,
  result: CalculationResult
): string {
  const regimeText: Record<string, string> = {
    laminar: '层流状态，流体分层流动，摩擦阻力与流速成正比。',
    transitional: '过渡流状态，流动不稳定，可能在层流与湍流之间切换。',
    turbulent: '湍流状态，流体充分混合，摩擦阻力与流速的1.75-2次方成正比。',
    critical: '临界过渡区，流动极不稳定，计算结果仅供参考。',
  };

  const headLossPercent = result.headLoss / (result.headLoss + result.localLoss) * 100;
  const localLossPercent = result.localLoss / (result.headLoss + result.localLoss) * 100;

  return `
本次计算采用达西-魏斯巴赫公式进行管路压降分析。

【流态分析】
雷诺数 Re = ${result.reynolds.toFixed(0)}，判定为${regimeText[result.flowRegime]}

【阻力构成分析】
- 沿程阻力损失：${result.headLoss.toFixed(4)} m (占比 ${headLossPercent.toFixed(1)}%)
- 局部阻力损失：${result.localLoss.toFixed(4)} m (占比 ${localLossPercent.toFixed(1)}%)

【计算参数敏感性】
- 管径对压降影响显著（与管径的5次方成反比）
- 流量对压降影响显著（与流量的平方成正比）
- 管长与压降呈线性关系
- 粗糙度在湍流状态下影响明显，层流状态下可忽略

【公式说明】
沿程损失：hf = f × (L/D) × (v²/2g)
局部损失：hl = Σ(K × v²/2g)
总压降：ΔP = ρ × g × (hf + hl)
  `.trim();
}

export function generateCalculationSteps(
  params: CalculationParams,
  velocity: number,
  reynolds: number,
  frictionFactor: number,
  headLoss: number,
  localLoss: number,
  totalPressureDrop: number
): CalculationStep[] {
  return [
    {
      name: '流速计算',
      formula: 'v = Q / A',
      value: velocity,
      unit: 'm/s',
      description: `流量 Q = ${params.flowRate} ${params.flowRateUnit}，管径 D = ${params.diameter} ${params.diameterUnit}`,
    },
    {
      name: '雷诺数计算',
      formula: 'Re = v×D/ν',
      value: reynolds,
      unit: '-',
      description: `运动粘度 ν = ${params.fluid.viscosity} m²/s`,
    },
    {
      name: '摩擦系数计算',
      formula: reynolds < 2300 ? 'f = 64/Re' : '柯尔布鲁克公式',
      value: frictionFactor,
      unit: '-',
      description: `相对粗糙度 ε/D = ${(params.roughness / params.diameter).toExponential(4)}`,
    },
    {
      name: '沿程损失计算',
      formula: 'hf = f×(L/D)×(v²/2g)',
      value: headLoss,
      unit: 'm',
      description: `管长 L = ${params.pipeLength} ${params.pipeLengthUnit}`,
    },
    {
      name: '局部损失计算',
      formula: 'hl = Σ(K×v²/2g)',
      value: localLoss,
      unit: 'm',
      description: `共 ${params.valves.length} 种阀门/管件，${params.valves.reduce((s, v) => s + v.count, 0)} 个`,
    },
    {
      name: '总压降计算',
      formula: 'ΔP = ρ×g×(hf+hl)',
      value: totalPressureDrop,
      unit: 'Pa',
      description: `流体密度 ρ = ${params.fluid.density} kg/m³`,
    },
  ];
}

export function calculatePressureDrop(params: CalculationParams): CalculationResult {
  const velocity = calculateVelocity(
    params.flowRate,
    params.flowRateUnit,
    params.diameter,
    params.diameterUnit
  );

  const reynolds = calculateReynolds(
    velocity,
    params.diameter,
    params.diameterUnit,
    params.fluid.viscosity
  );

  const flowRegime = determineFlowRegime(reynolds);

  const frictionFactor = calculateFrictionFactor(
    reynolds,
    params.roughness,
    params.roughnessUnit,
    params.diameter,
    params.diameterUnit
  );

  const headLoss = calculateHeadLoss(
    frictionFactor,
    params.pipeLength,
    params.pipeLengthUnit,
    params.diameter,
    params.diameterUnit,
    velocity
  );

  const localLoss = calculateLocalLoss(params.valves, velocity);

  const totalPressureDrop = calculateTotalPressureDrop(
    headLoss,
    localLoss,
    params.fluid.density
  );

  const warnings = detectWarnings(params, reynolds, velocity);

  const calculationSteps = generateCalculationSteps(
    params,
    velocity,
    reynolds,
    frictionFactor,
    headLoss,
    localLoss,
    totalPressureDrop
  );

  const tempResult: CalculationResult = {
    reynolds,
    flowRegime,
    frictionFactor,
    velocity,
    headLoss,
    localLoss,
    totalPressureDrop,
    warnings,
    explanation: '',
    calculationSteps,
  };

  const explanation = generateExplanation(params, tempResult);

  return {
    ...tempResult,
    explanation,
  };
}
