import { CircuitParams, DataPoint, CalculationResult, Warning, TimeUnit } from '@/types';
import { toOhms, toFarads, toVolts, toSeconds, formatTimeConstant } from './units';
import { generateId } from './helpers';

export function calculateTimeConstant(params: CircuitParams): number {
  const R = toOhms(params.resistance, params.resistanceUnit);
  const C = toFarads(params.capacitance, params.capacitanceUnit);
  return R * C;
}

export function calculateChargeVoltage(
  t: number,
  Vs: number,
  V0: number,
  tau: number
): number {
  if (tau === 0) return Vs;
  return Vs + (V0 - Vs) * Math.exp(-t / tau);
}

export function calculateDischargeVoltage(
  t: number,
  V0: number,
  tau: number
): number {
  if (tau === 0) return 0;
  return V0 * Math.exp(-t / tau);
}

export function calculateCurrent(
  t: number,
  Vs: number,
  V0: number,
  R: number,
  tau: number,
  isCharging: boolean
): number {
  if (tau === 0 || R === 0) return 0;
  if (isCharging) {
    return ((Vs - V0) / R) * Math.exp(-t / tau);
  } else {
    return (V0 / R) * Math.exp(-t / tau);
  }
}

export function generateChargeCurve(
  params: CircuitParams,
  tau: number
): DataPoint[] {
  const Vs = toVolts(params.sourceVoltage, params.voltageUnit);
  const V0 = toVolts(params.initialVoltage, params.voltageUnit);
  const R = toOhms(params.resistance, params.resistanceUnit);
  const timeRange = toSeconds(params.timeRange, params.timeUnit);
  const points: DataPoint[] = [];
  const dt = timeRange / (params.samplePoints - 1);

  for (let i = 0; i < params.samplePoints; i++) {
    const t = i * dt;
    const voltage = calculateChargeVoltage(t, Vs, V0, tau);
    const current = calculateCurrent(t, Vs, V0, R, tau, true);
    points.push({
      time: t,
      voltage,
      current,
      source: 'theoretical',
    });
  }
  return points;
}

export function generateDischargeCurve(
  params: CircuitParams,
  tau: number
): DataPoint[] {
  const V0 = toVolts(params.sourceVoltage, params.voltageUnit);
  const R = toOhms(params.resistance, params.resistanceUnit);
  const timeRange = toSeconds(params.timeRange, params.timeUnit);
  const points: DataPoint[] = [];
  const dt = timeRange / (params.samplePoints - 1);

  for (let i = 0; i < params.samplePoints; i++) {
    const t = i * dt;
    const voltage = calculateDischargeVoltage(t, V0, tau);
    const current = calculateCurrent(t, 0, V0, R, tau, false);
    points.push({
      time: t,
      voltage,
      current,
      source: 'theoretical',
    });
  }
  return points;
}

export function calculateRCResult(params: CircuitParams): CalculationResult {
  const warnings: Warning[] = [];
  const tau = calculateTimeConstant(params);
  const tauInfo = formatTimeConstant(tau);

  if (tau < 1e-6 || tau > 1000) {
    warnings.push({
      id: generateId(),
      type: 'time_constant_error',
      severity: 'error',
      message: `时间常数 τ = ${tauInfo.display} 超出教学实验常用范围 (1μs ~ 1000s)`,
      field: 'timeConstant',
      value: tau,
      suggestion: '请检查电阻和电容值是否合理，或调整单位。极端值可能导致曲线难以观察。',
    });
  }

  if (params.initialVoltage !== 0) {
    const V0 = toVolts(params.initialVoltage, params.voltageUnit);
    warnings.push({
      id: generateId(),
      type: 'nonzero_initial',
      severity: 'warning',
      message: `初始电压 V0 = ${V0.toFixed(4)} V 不为零，充电曲线公式已修正为 Vc(t) = Vs + (V0 - Vs)e^(-t/τ)`,
      field: 'initialVoltage',
      value: params.initialVoltage,
      suggestion: '标准RC充电实验通常假设电容初始不带电。请确认这是实验设置还是数据录入错误。',
    });
  }

  if (params.resistance <= 0) {
    warnings.push({
      id: generateId(),
      type: 'out_of_range',
      severity: 'error',
      message: '电阻值必须大于零',
      field: 'resistance',
      value: params.resistance,
      suggestion: '请输入有效的电阻值。',
    });
  }

  if (params.capacitance <= 0) {
    warnings.push({
      id: generateId(),
      type: 'out_of_range',
      severity: 'error',
      message: '电容值必须大于零',
      field: 'capacitance',
      value: params.capacitance,
      suggestion: '请输入有效的电容值。',
    });
  }

  if (params.samplePoints < 2) {
    warnings.push({
      id: generateId(),
      type: 'out_of_range',
      severity: 'warning',
      message: '采样点数过少，建议至少10个点以获得平滑曲线',
      field: 'samplePoints',
      value: params.samplePoints,
      suggestion: '增加采样点数可提高曲线精度。',
    });
  }

  let status: CalculationResult['status'] = 'normal';
  if (warnings.length > 0) {
    const hasError = warnings.some(w => w.severity === 'error');
    const hasTimeConstantError = warnings.some(w => w.type === 'time_constant_error');
    if (hasTimeConstantError) {
      status = 'needs_review';
    } else if (hasError) {
      status = 'error';
    } else {
      status = 'warning';
    }
  }

  const chargeCurve = generateChargeCurve(params, tau);
  const dischargeCurve = generateDischargeCurve(params, tau);

  return {
    paramsId: params.id,
    timeConstant: tau,
    timeConstantUnit: tauInfo.unit,
    timeConstantDisplay: tauInfo.display,
    chargeCurve,
    dischargeCurve,
    warnings,
    status,
    calculatedAt: new Date().toISOString(),
  };
}
