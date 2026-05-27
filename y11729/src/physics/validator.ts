import { PARAM_LIMITS } from './constants';
import type { SimulationParams, Warning } from './types';

export interface ValidationResult {
  isValid: boolean;
  warnings: Warning[];
  errors: Warning[];
}

export const validateParams = (params: SimulationParams): ValidationResult => {
  const warnings: Warning[] = [];
  const errors: Warning[] = [];

  const { launchAngle, dragCoefficient, timeStep, initialVelocity, arrowMass, targetDistance } =
    params;

  if (launchAngle < PARAM_LIMITS.launchAngle.min || launchAngle > PARAM_LIMITS.launchAngle.max) {
    errors.push({
      type: 'ANGLE_OUT_OF_RANGE',
      message: `发射角度 ${launchAngle}° 超出合理范围 [${PARAM_LIMITS.launchAngle.min}°, ${PARAM_LIMITS.launchAngle.max}°]`,
      severity: 'error',
      suggestion: `请调整角度至 ${PARAM_LIMITS.launchAngle.min}°-${PARAM_LIMITS.launchAngle.max}° 之间`,
    });
  }

  if (dragCoefficient > 1.5) {
    warnings.push({
      type: 'DRAG_TOO_HIGH',
      message: `阻力系数 ${dragCoefficient} 偏高，可能导致明显的数值衰减`,
      severity: 'warning',
      suggestion: '典型箭矢阻力系数约为 0.3-0.7',
    });
  }

  if (timeStep > 0.05) {
    warnings.push({
      type: 'TIME_STEP_TOO_LARGE',
      message: `积分步长 ${timeStep}s 较大，可能影响计算精度`,
      severity: 'warning',
      suggestion: '建议使用 0.005s-0.02s 的步长以获得较好精度',
    });
  }

  const maxTheoreticalRange =
    (initialVelocity * initialVelocity * Math.sin(2 * (Math.PI / 4))) / 9.81;
  if (targetDistance > maxTheoreticalRange * 0.95) {
    warnings.push({
      type: 'RANGE_EXCEEDED',
      message: `靶距 ${targetDistance}m 接近理论最大射程 ${maxTheoreticalRange.toFixed(1)}m`,
      severity: 'warning',
      suggestion: '建议提高初速度或检查靶距设置',
    });
  }

  if (initialVelocity > 120) {
    warnings.push({
      type: 'NUMERICAL_INSTABILITY',
      message: `初速度 ${initialVelocity}m/s 较高，建议适当减小积分步长`,
      severity: 'warning',
      suggestion: '高速箭矢可能需要更小的时间步长以保证精度',
    });
  }

  if (arrowMass < 15) {
    warnings.push({
      type: 'DRAG_TOO_HIGH',
      message: `箭重 ${arrowMass}g 偏轻，空气阻力影响会更显著`,
      severity: 'warning',
      suggestion: '轻箭受空气阻力影响更大，请谨慎解读结果',
    });
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
};

export const formatParamForDisplay = (
  key: keyof SimulationParams,
  value: number
): { displayValue: string; unit: string; label: string } => {
  const labels: Record<keyof SimulationParams, string> = {
    initialVelocity: '初速度',
    launchAngle: '发射角',
    dragCoefficient: '阻力系数',
    arrowMass: '箭重',
    targetDistance: '靶距',
    timeStep: '积分步长',
    arrowDiameter: '箭径',
  };

  const units: Record<keyof SimulationParams, string> = {
    initialVelocity: 'm/s',
    launchAngle: '°',
    dragCoefficient: '',
    arrowMass: 'g',
    targetDistance: 'm',
    timeStep: 's',
    arrowDiameter: 'm',
  };

  const formatters: Record<keyof SimulationParams, (v: number) => string> = {
    initialVelocity: (v) => v.toFixed(1),
    launchAngle: (v) => v.toFixed(1),
    dragCoefficient: (v) => v.toFixed(3),
    arrowMass: (v) => v.toFixed(0),
    targetDistance: (v) => v.toFixed(1),
    timeStep: (v) => v.toFixed(3),
    arrowDiameter: (v) => v.toFixed(4),
  };

  return {
    displayValue: formatters[key](value),
    unit: units[key],
    label: labels[key],
  };
};
