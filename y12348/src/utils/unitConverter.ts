import type {
  DiameterUnit,
  LengthUnit,
  FlowUnit,
  PressureUnit,
  UnitValidationResult,
  PipeSegment,
  FluidProperties,
  ValveConfig,
  Branch,
} from '@/types';

const GRAVITY = 9.80665;

export function convertDiameter(value: number, from: DiameterUnit, to: DiameterUnit): number {
  const toMeters: Record<DiameterUnit, number> = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    inch: 0.0254,
  };
  return (value * toMeters[from]) / toMeters[to];
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  const toMeters: Record<LengthUnit, number> = {
    m: 1,
    km: 1000,
    ft: 0.3048,
  };
  return (value * toMeters[from]) / toMeters[to];
}

export function convertFlowRate(value: number, from: FlowUnit, to: FlowUnit): number {
  const toCubicMetersPerSecond: Record<FlowUnit, number> = {
    'm³/h': 1 / 3600,
    'L/s': 0.001,
    'm³/s': 1,
    gpm: 6.30902e-5,
  };
  return (value * toCubicMetersPerSecond[from]) / toCubicMetersPerSecond[to];
}

export function convertPressure(value: number, from: PressureUnit, to: PressureUnit): number {
  const toPascals: Record<PressureUnit, number> = {
    Pa: 1,
    kPa: 1000,
    bar: 100000,
    psi: 6894.76,
    mH2O: 9806.65,
  };
  return (value * toPascals[from]) / toPascals[to];
}

export function diameterToMeters(value: number, unit: DiameterUnit): number {
  return convertDiameter(value, unit, 'm');
}

export function lengthToMeters(value: number, unit: LengthUnit): number {
  return convertLength(value, unit, 'm');
}

export function flowRateToCubicMetersPerSecond(value: number, unit: FlowUnit): number {
  return convertFlowRate(value, unit, 'm³/s');
}

export function pressureFromPascals(value: number, to: PressureUnit): number {
  return convertPressure(value, 'Pa', to);
}

export function validateUnits(
  segments: PipeSegment[],
  flowRate: number,
  flowUnit: FlowUnit,
  fluid: FluidProperties,
  valve: ValveConfig,
  branches: Branch[]
): UnitValidationResult[] {
  const results: UnitValidationResult[] = [];

  segments.forEach((segment, index) => {
    const prefix = `管路段${index + 1}[${segment.name}]`;

    if (segment.diameter <= 0) {
      results.push({
        field: `${prefix}.管径`,
        value: segment.diameter,
        currentUnit: segment.diameterUnit,
        errorType: 'invalid',
        message: `${prefix} 管径必须大于0`,
        confidence: 1.0,
      });
    } else if (segment.diameterUnit === 'm' && segment.diameter > 2) {
      results.push({
        field: `${prefix}.管径`,
        value: segment.diameter,
        currentUnit: segment.diameterUnit,
        suggestedUnit: 'mm',
        errorType: 'suspicious',
        message: `${prefix} 管径 ${segment.diameter}m 异常偏大，是否应为 ${segment.diameter * 1000}mm？`,
        confidence: 0.85,
      });
    } else if (segment.diameterUnit === 'mm' && segment.diameter < 10) {
      results.push({
        field: `${prefix}.管径`,
        value: segment.diameter,
        currentUnit: segment.diameterUnit,
        suggestedUnit: 'cm',
        errorType: 'suspicious',
        message: `${prefix} 管径 ${segment.diameter}mm 异常偏小，是否应为 ${segment.diameter / 10}cm？`,
        confidence: 0.7,
      });
    }

    if (segment.length <= 0) {
      results.push({
        field: `${prefix}.管长`,
        value: segment.length,
        currentUnit: segment.lengthUnit,
        errorType: 'invalid',
        message: `${prefix} 管长必须大于0`,
        confidence: 1.0,
      });
    } else if (segment.lengthUnit === 'm' && segment.length > 5000) {
      results.push({
        field: `${prefix}.管长`,
        value: segment.length,
        currentUnit: segment.lengthUnit,
        suggestedUnit: 'km',
        errorType: 'suspicious',
        message: `${prefix} 管长 ${segment.length}m 异常偏大，是否应为 ${segment.length / 1000}km？`,
        confidence: 0.8,
      });
    }

    if (segment.elbowCount < 0) {
      results.push({
        field: `${prefix}.弯头数量`,
        value: segment.elbowCount,
        currentUnit: '个',
        errorType: 'invalid',
        message: `${prefix} 弯头数量不能为负数`,
        confidence: 1.0,
      });
    }

    if (segment.roughness < 0) {
      results.push({
        field: `${prefix}.管壁粗糙度`,
        value: segment.roughness,
        currentUnit: 'mm',
        errorType: 'invalid',
        message: `${prefix} 管壁粗糙度不能为负数`,
        confidence: 1.0,
      });
    }
  });

  if (flowRate <= 0) {
    results.push({
      field: '总流量',
      value: flowRate,
      currentUnit: flowUnit,
      errorType: 'invalid',
      message: '总流量必须大于0',
      confidence: 1.0,
    });
  } else if (flowUnit === 'm³/s' && flowRate < 0.001) {
    results.push({
      field: '总流量',
      value: flowRate,
      currentUnit: flowUnit,
      suggestedUnit: 'm³/h',
      errorType: 'suspicious',
      message: `总流量 ${flowRate}m³/s 异常偏小，是否应为 ${flowRate * 3600}m³/h？`,
      confidence: 0.75,
    });
  } else if (flowUnit === 'm³/h' && flowRate > 10000) {
    results.push({
      field: '总流量',
      value: flowRate,
      currentUnit: flowUnit,
      suggestedUnit: 'm³/s',
      errorType: 'suspicious',
      message: `总流量 ${flowRate}m³/h 异常偏大，是否应为 ${(flowRate / 3600).toFixed(4)}m³/s？`,
      confidence: 0.7,
    });
  }

  if (valve.openingPercentage < 0 || valve.openingPercentage > 100) {
    results.push({
      field: '阀门开度',
      value: valve.openingPercentage,
      currentUnit: '%',
      errorType: 'invalid',
      message: '阀门开度必须在 0-100% 之间',
      confidence: 1.0,
    });
  }

  if (valve.isHalfOpen && valve.openingPercentage >= 90) {
    results.push({
      field: '阀门状态',
      value: valve.openingPercentage,
      currentUnit: '%',
      errorType: 'inconsistent',
      message: `阀门标记为"半开"但开度为 ${valve.openingPercentage}%，请确认阀门状态`,
      confidence: 0.9,
    });
  }

  branches.forEach((branch, index) => {
    const prefix = `支路${index + 1}[${branch.name}]`;

    if (branch.flowRateRatio <= 0 || branch.flowRateRatio > 1) {
      results.push({
        field: `${prefix}.流量分配比`,
        value: branch.flowRateRatio,
        currentUnit: '',
        errorType: 'invalid',
        message: `${prefix} 流量分配比必须在 (0, 1] 之间`,
        confidence: 1.0,
      });
    }

    if (branch.isMissingData && branch.missingFields.length > 0) {
      results.push({
        field: `${prefix}.数据完整性`,
        value: branch.missingFields.length,
        currentUnit: '项',
        errorType: 'inconsistent',
        message: `${prefix} 存在 ${branch.missingFields.length} 项未填写：${branch.missingFields.join('、')}`,
        confidence: 1.0,
      });
    }
  });

  const totalRatio = branches.reduce((sum, b) => sum + b.flowRateRatio, 0);
  if (branches.length > 0 && Math.abs(totalRatio - 1) > 0.01) {
    results.push({
      field: '支路流量分配',
      value: totalRatio,
      currentUnit: '',
      errorType: 'inconsistent',
      message: `所有支路流量分配比之和为 ${totalRatio.toFixed(4)}，不等于 1.0`,
      confidence: 1.0,
    });
  }

  if (fluid.temperature < -50 || fluid.temperature > 300) {
    results.push({
      field: '流体温度',
      value: fluid.temperature,
      currentUnit: '°C',
      errorType: 'suspicious',
      message: `流体温度 ${fluid.temperature}°C 超出常用范围 (-50°C ~ 300°C)`,
      confidence: 0.6,
    });
  }

  return results;
}

export function formatNumber(value: number, decimals: number = 4): string {
  if (Math.abs(value) < 0.0001 && value !== 0) {
    return value.toExponential(decimals);
  }
  return value.toFixed(decimals);
}

export function formatPressure(value: number, unit: PressureUnit): string {
  const converted = pressureFromPascals(value, unit);
  return `${formatNumber(converted, 4)} ${unit}`;
}

export { GRAVITY };
