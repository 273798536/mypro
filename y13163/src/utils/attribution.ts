import type { BuoyDataPoint, ParamVersion, BoundaryValue } from '@/types';

export function calculateAttribution(
  waveHeight: number,
  wavePeriod: number,
  version: ParamVersion
): number {
  if (version.version === 'v2.1.0') {
    const alpha = 0.15;
    const beta = 0.08;
    const gamma = 0.3;
    const delta = -0.05;
    const sigma = Math.abs(waveHeight - 3) * 0.2;
    return alpha * waveHeight + beta * wavePeriod + gamma * sigma + delta;
  } else if (version.version === 'v2.0.0') {
    const alpha = 0.18;
    const beta = 0.06;
    const delta = -0.08;
    return alpha * waveHeight + beta * wavePeriod + delta;
  } else {
    const k = 0.2;
    const b = -0.1;
    return k * waveHeight + b;
  }
}

export function checkBoundaries(
  waveHeight: number,
  wavePeriod: number,
  errorValue: number,
  boundaries: BoundaryValue[]
): {
  isExtreme: boolean;
  isWarning: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  for (const boundary of boundaries) {
    if (boundary.name === '波高上限' && waveHeight > boundary.value) {
      violations.push(`波高 ${waveHeight.toFixed(2)}${boundary.unit} 超过上限 ${boundary.value}${boundary.unit}`);
    }
    if (boundary.name === '波高下限' && waveHeight < boundary.value) {
      violations.push(`波高 ${waveHeight.toFixed(2)}${boundary.unit} 低于下限 ${boundary.value}${boundary.unit}`);
    }
    if (boundary.name === '波周期上限' && wavePeriod > boundary.value) {
      violations.push(`波周期 ${wavePeriod.toFixed(1)}${boundary.unit} 超过上限 ${boundary.value}${boundary.unit}`);
    }
    if (boundary.name === '波周期下限' && wavePeriod < boundary.value) {
      violations.push(`波周期 ${wavePeriod.toFixed(1)}${boundary.unit} 低于下限 ${boundary.value}${boundary.unit}`);
    }
    if (boundary.name === '误差阈值' && Math.abs(errorValue) > boundary.value) {
      violations.push(`误差值 ${Math.abs(errorValue).toFixed(3)}${boundary.unit} 超过阈值 ${boundary.value}${boundary.unit}`);
    }
  }

  const hasErrorViolation = violations.some((v) => v.includes('超过上限') || v.includes('低于下限'));
  const hasWarningViolation = violations.some((v) => v.includes('超过阈值'));

  return {
    isExtreme: hasErrorViolation,
    isWarning: hasWarningViolation,
    violations,
  };
}

export function recalculateAllData(
  data: BuoyDataPoint[],
  version: ParamVersion
): BuoyDataPoint[] {
  return data.map((point) => {
    const newError = calculateAttribution(point.waveHeight, point.wavePeriod, version);
    const boundaryCheck = checkBoundaries(
      point.waveHeight,
      point.wavePeriod,
      newError,
      version.boundaryValues
    );

    let newStatus: BuoyDataPoint['status'] = 'normal';
    if (boundaryCheck.isExtreme) {
      newStatus = 'error';
    } else if (boundaryCheck.isWarning) {
      newStatus = 'warning';
    }

    return {
      ...point,
      errorValue: Math.round(newError * 1000) / 1000,
      attribution: version.version,
      status: newStatus,
    };
  });
}
