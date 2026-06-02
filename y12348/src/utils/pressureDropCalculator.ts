import { v4 as uuidv4 } from 'uuid';
import type {
  PipeSegment,
  FluidProperties,
  ValveConfig,
  IntermediateResult,
  PressureDropResult,
  Branch,
  FlowUnit,
  PressureUnit,
  ContradictionResult,
  CalculationSession,
} from '@/types';
import {
  diameterToMeters,
  lengthToMeters,
  flowRateToCubicMetersPerSecond,
  GRAVITY,
} from './unitConverter';
import { getValveKFactor, getElbowKFactor } from '@/data/valveCoefficients';

function createIntermediateResult(
  name: string,
  value: number,
  unit: string,
  formula: string,
  inputs: Record<string, { value: number; unit: string }>
): IntermediateResult {
  return {
    id: uuidv4(),
    name,
    value,
    unit,
    formula,
    inputs,
    timestamp: Date.now(),
  };
}

export function calculateFlowVelocity(
  flowRate: number,
  flowUnit: FlowUnit,
  diameter: number,
  diameterUnit: string
): IntermediateResult {
  const Q = flowRateToCubicMetersPerSecond(flowRate, flowUnit);
  const d = diameterToMeters(diameter, diameterUnit as never);
  const A = Math.PI * Math.pow(d / 2, 2);
  const v = Q / A;

  return createIntermediateResult(
    '流速',
    v,
    'm/s',
    'v = Q / A',
    {
      Q: { value: Q, unit: 'm³/s' },
      A: { value: A, unit: 'm²' },
      d: { value: d, unit: 'm' },
    }
  );
}

export function calculateReynoldsNumber(
  velocity: number,
  diameter: number,
  diameterUnit: string,
  viscosity: number
): IntermediateResult {
  const d = diameterToMeters(diameter, diameterUnit as never);
  const nu = viscosity;
  const Re = (velocity * d) / nu;

  return createIntermediateResult(
    '雷诺数',
    Re,
    '',
    'Re = (v × d) / ν',
    {
      v: { value: velocity, unit: 'm/s' },
      d: { value: d, unit: 'm' },
      ν: { value: nu, unit: 'Pa·s' },
    }
  );
}

export function calculateFrictionFactor(
  reynoldsNumber: number,
  roughness: number,
  diameter: number,
  diameterUnit: string
): IntermediateResult {
  const d = diameterToMeters(diameter, diameterUnit as never);
  const epsilon = roughness / 1000;
  const epsilonOverD = epsilon / d;

  let f: number;

  if (reynoldsNumber < 2300) {
    f = 64 / reynoldsNumber;
  } else if (reynoldsNumber < 4000) {
    const fLaminar = 64 / 2300;
    const fTurbulent = calculateColebrook(4000, epsilonOverD);
    const ratio = (reynoldsNumber - 2300) / (4000 - 2300);
    f = fLaminar + (fTurbulent - fLaminar) * ratio;
  } else {
    f = calculateColebrook(reynoldsNumber, epsilonOverD);
  }

  return createIntermediateResult(
    '摩擦系数',
    f,
    '',
    reynoldsNumber < 2300 ? 'f = 64 / Re (层流)' : '1/√f = -2 × log10(ε/(3.7d) + 2.51/(Re√f)) (科尔布鲁克)',
    {
      Re: { value: reynoldsNumber, unit: '' },
      'ε/d': { value: epsilonOverD, unit: '' },
      ε: { value: epsilon, unit: 'm' },
      d: { value: d, unit: 'm' },
    }
  );
}

function calculateColebrook(Re: number, epsilonOverD: number): number {
  let f = 0.02;
  const tolerance = 1e-8;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    const sqrtF = Math.sqrt(f);
    const rightSide = -2 * Math.log10(epsilonOverD / 3.7 + 2.51 / (Re * sqrtF));
    const newF = 1 / (rightSide * rightSide);

    if (Math.abs(newF - f) < tolerance) {
      return newF;
    }
    f = newF;
  }

  return f;
}

export function calculateFrictionLoss(
  frictionFactor: number,
  length: number,
  lengthUnit: string,
  diameter: number,
  diameterUnit: string,
  velocity: number
): IntermediateResult {
  const L = lengthToMeters(length, lengthUnit as never);
  const d = diameterToMeters(diameter, diameterUnit as never);
  const hf = frictionFactor * (L / d) * (Math.pow(velocity, 2) / (2 * GRAVITY));

  return createIntermediateResult(
    '沿程阻力',
    hf,
    'm',
    'hf = f × (L/d) × (v²/2g)',
    {
      f: { value: frictionFactor, unit: '' },
      L: { value: L, unit: 'm' },
      d: { value: d, unit: 'm' },
      v: { value: velocity, unit: 'm/s' },
      g: { value: GRAVITY, unit: 'm/s²' },
    }
  );
}

export function calculateLocalLoss(
  elbowCount: number,
  elbowAngle: number,
  velocity: number
): IntermediateResult {
  const K = getElbowKFactor(elbowAngle);
  const totalK = K * elbowCount;
  const hl = totalK * (Math.pow(velocity, 2) / (2 * GRAVITY));

  return createIntermediateResult(
    '局部阻力',
    hl,
    'm',
    'hl = ΣK × (v²/2g)',
    {
      K: { value: K, unit: '' },
      '弯头数量': { value: elbowCount, unit: '个' },
      '弯头角度': { value: elbowAngle, unit: '°' },
      'ΣK': { value: totalK, unit: '' },
      v: { value: velocity, unit: 'm/s' },
      g: { value: GRAVITY, unit: 'm/s²' },
    }
  );
}

export function calculateValveLoss(
  valve: ValveConfig,
  velocity: number
): IntermediateResult {
  const Kv = getValveKFactor(valve.valveType, valve.openingPercentage);
  const hv = Kv * (Math.pow(velocity, 2) / (2 * GRAVITY));

  return createIntermediateResult(
    '阀门阻力',
    hv,
    'm',
    'hv = Kv × (v²/2g)',
    {
      Kv: { value: Kv, unit: '' },
      '阀门类型': { value: valve.valveType === 'gate' ? 1 : 0, unit: valve.valveType },
      '开度': { value: valve.openingPercentage, unit: '%' },
      v: { value: velocity, unit: 'm/s' },
      g: { value: GRAVITY, unit: 'm/s²' },
    }
  );
}

export function calculateTotalLoss(
  frictionLoss: number,
  localLoss: number,
  valveLoss: number
): IntermediateResult {
  const hTotal = frictionLoss + localLoss + valveLoss;

  return createIntermediateResult(
    '总阻力',
    hTotal,
    'm',
    'h_total = hf + hl + hv',
    {
      hf: { value: frictionLoss, unit: 'm' },
      hl: { value: localLoss, unit: 'm' },
      hv: { value: valveLoss, unit: 'm' },
    }
  );
}

export function calculatePressureDrop(
  totalHeadLoss: number,
  density: number,
  targetUnit: PressureUnit
): { valuePa: number; value: number; unit: PressureUnit; result: IntermediateResult } {
  const deltaP_Pa = density * GRAVITY * totalHeadLoss;

  const conversionFactors: Record<PressureUnit, number> = {
    Pa: 1,
    kPa: 1000,
    bar: 100000,
    psi: 6894.76,
    mH2O: 9806.65,
  };

  const convertedValue = deltaP_Pa / conversionFactors[targetUnit];

  const result = createIntermediateResult(
    '总压降',
    convertedValue,
    targetUnit,
    'ΔP = ρ × g × h_total',
    {
      ρ: { value: density, unit: 'kg/m³' },
      g: { value: GRAVITY, unit: 'm/s²' },
      h_total: { value: totalHeadLoss, unit: 'm' },
    }
  );

  return {
    valuePa: deltaP_Pa,
    value: convertedValue,
    unit: targetUnit,
    result,
  };
}

export function calculateSegmentPressureDrop(
  segment: PipeSegment,
  flowRate: number,
  flowUnit: FlowUnit,
  fluid: FluidProperties,
  valve: ValveConfig,
  pressureUnit: PressureUnit
): PressureDropResult {
  const flowVelocity = calculateFlowVelocity(flowRate, flowUnit, segment.diameter, segment.diameterUnit);
  const reynoldsNumber = calculateReynoldsNumber(
    flowVelocity.value,
    segment.diameter,
    segment.diameterUnit,
    fluid.viscosity
  );
  const frictionFactor = calculateFrictionFactor(
    reynoldsNumber.value,
    segment.roughness,
    segment.diameter,
    segment.diameterUnit
  );
  const frictionLoss = calculateFrictionLoss(
    frictionFactor.value,
    segment.length,
    segment.lengthUnit,
    segment.diameter,
    segment.diameterUnit,
    flowVelocity.value
  );
  const localLoss = calculateLocalLoss(
    segment.elbowCount,
    segment.elbowAngle,
    flowVelocity.value
  );
  const valveLoss = calculateValveLoss(valve, flowVelocity.value);
  const totalLoss = calculateTotalLoss(
    frictionLoss.value,
    localLoss.value,
    valveLoss.value
  );

  return {
    segmentId: segment.id,
    flowVelocity,
    reynoldsNumber,
    frictionFactor,
    frictionLoss,
    localLoss,
    valveLoss,
    totalLoss,
  };
}

export function checkDiameterFlowMatching(
  segment: PipeSegment,
  flowRate: number,
  flowUnit: FlowUnit,
  fluid: FluidProperties
): ContradictionResult | null {
  const Q = flowRateToCubicMetersPerSecond(flowRate, flowUnit);
  const d = diameterToMeters(segment.diameter, segment.diameterUnit);
  const A = Math.PI * Math.pow(d / 2, 2);
  const v = Q / A;

  let recommendedVelocity: { min: number; max: number };
  if (fluid.type === 'water') {
    recommendedVelocity = { min: 0.5, max: 3.0 };
  } else if (fluid.type === 'steam') {
    recommendedVelocity = { min: 15, max: 40 };
  } else if (fluid.type === 'air') {
    recommendedVelocity = { min: 5, max: 20 };
  } else {
    recommendedVelocity = { min: 0.3, max: 2.0 };
  }

  if (v < recommendedVelocity.min) {
    return {
      type: 'diameter_flow_mismatch',
      severity: 'warning',
      message: `${segment.name} 流速 ${v.toFixed(2)} m/s 偏低，建议检查管径是否偏大或流量是否偏小`,
      evidence: {
        fieldA: { name: '实际流速', value: v, unit: 'm/s' },
        fieldB: { name: '推荐流速范围', value: recommendedVelocity.min, unit: `${recommendedVelocity.min}-${recommendedVelocity.max} m/s` },
        suggestion: `建议缩小管径或增大流量，使流速保持在 ${recommendedVelocity.min}-${recommendedVelocity.max} m/s 范围内`,
      },
    };
  }

  if (v > recommendedVelocity.max) {
    return {
      type: 'diameter_flow_mismatch',
      severity: 'error',
      message: `${segment.name} 流速 ${v.toFixed(2)} m/s 偏高，可能导致过大压降和噪音`,
      evidence: {
        fieldA: { name: '实际流速', value: v, unit: 'm/s' },
        fieldB: { name: '推荐流速范围', value: recommendedVelocity.max, unit: `${recommendedVelocity.min}-${recommendedVelocity.max} m/s` },
        suggestion: `建议增大管径或减小流量，使流速保持在 ${recommendedVelocity.min}-${recommendedVelocity.max} m/s 范围内`,
      },
    };
  }

  return null;
}

export function checkSegmentConsistency(
  segments: PipeSegment[]
): ContradictionResult[] {
  const contradictions: ContradictionResult[] = [];

  if (segments.length < 2) return contradictions;

  const diameters = segments.map(s => ({
    segment: s,
    d: diameterToMeters(s.diameter, s.diameterUnit),
  }));

  for (let i = 0; i < diameters.length - 1; i++) {
    const d1 = diameters[i];
    const d2 = diameters[i + 1];
    const ratio = d1.d / d2.d;

    if (ratio > 2 || ratio < 0.5) {
      contradictions.push({
        type: 'segment_inconsistent',
        severity: 'warning',
        message: `相邻管路段 [${d1.segment.name}] 和 [${d2.segment.name}] 管径差异过大 (${ratio.toFixed(2)}倍)`,
        evidence: {
          fieldA: { name: d1.segment.name, value: d1.segment.diameter, unit: d1.segment.diameterUnit },
          fieldB: { name: d2.segment.name, value: d2.segment.diameter, unit: d2.segment.diameterUnit },
          suggestion: '建议检查管径是否逐级变化，或考虑添加异径管',
        },
      });
    }
  }

  return contradictions;
}

export function calculateFullSession(
  session: CalculationSession,
  pressureUnit: PressureUnit
): CalculationSession['results'] {
  const segmentResults: Record<string, PressureDropResult> = {};
  const branchResults: Record<string, PressureDropResult> = {};
  const contradictions: ContradictionResult[] = [];
  let totalPressureDrop_Pa = 0;

  session.mainSegments.forEach(segment => {
    const result = calculateSegmentPressureDrop(
      segment,
      session.totalFlowRate,
      session.flowRateUnit,
      session.fluid,
      session.mainValve,
      pressureUnit
    );
    segmentResults[segment.id] = result;

    const pressureDrop = calculatePressureDrop(
      result.totalLoss.value,
      session.fluid.density,
      pressureUnit
    );
    totalPressureDrop_Pa += pressureDrop.valuePa;

    const matching = checkDiameterFlowMatching(
      segment,
      session.totalFlowRate,
      session.flowRateUnit,
      session.fluid
    );
    if (matching) {
      if (session.mainValve.isHalfOpen || session.mainValve.openingPercentage < 80) {
        matching.evidence.valveSnapshot = { ...session.mainValve };
      }
      contradictions.push(matching);
    }
  });

  const segmentConsistencies = checkSegmentConsistency(session.mainSegments);
  contradictions.push(...segmentConsistencies);

  session.branches.forEach(branch => {
    const branchFlowRate = session.totalFlowRate * branch.flowRateRatio;
    let branchTotalHeadLoss = 0;

    branch.segments.forEach(segment => {
      const result = calculateSegmentPressureDrop(
        segment,
        branchFlowRate,
        session.flowRateUnit,
        session.fluid,
        branch.valveConfig,
        pressureUnit
      );
      segmentResults[segment.id] = result;
      branchTotalHeadLoss += result.totalLoss.value;

      const matching = checkDiameterFlowMatching(
        segment,
        branchFlowRate,
        session.flowRateUnit,
        session.fluid
      );
      if (matching) {
        if (branch.valveConfig.isHalfOpen || branch.valveConfig.openingPercentage < 80) {
          matching.evidence.valveSnapshot = { ...branch.valveConfig };
        }
        contradictions.push(matching);
      }
    });

    const branchPressureDrop = calculatePressureDrop(
      branchTotalHeadLoss,
      session.fluid.density,
      pressureUnit
    );
    totalPressureDrop_Pa += branchPressureDrop.valuePa;

    if (branch.isMissingData) {
      contradictions.push({
        type: 'branch_missing',
        severity: 'error',
        message: `支路 [${branch.name}] 存在未填写数据：${branch.missingFields.join('、')}`,
        evidence: {
          fieldA: { name: '未填写项数', value: branch.missingFields.length, unit: '项' },
          suggestion: '请补充支路的完整数据，或标记为"待确认"',
        },
      });
    }
  });

  const totalPressureDrop = calculatePressureDrop(
    totalPressureDrop_Pa / (session.fluid.density * GRAVITY),
    session.fluid.density,
    pressureUnit
  );

  return {
    segmentResults,
    branchResults,
    totalPressureDrop: totalPressureDrop.value,
    pressureDropUnit: pressureUnit,
    contradictions,
    unitValidations: [],
    evidenceChain: [],
  };
}
