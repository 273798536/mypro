
import type { Alert, ExperimentParams, PressureField, ValidationResult } from '../types';

const ANGLE_MIN = -30;
const ANGLE_MAX = 30;
const ANGLE_WARNING_MIN = -25;
const ANGLE_WARNING_MAX = 25;

const VELOCITY_MIN = 0;
const VELOCITY_MAX = 100;
const VELOCITY_WARNING_MIN = 80;

const SAMPLING_WARNING_THRESHOLD = 1;
const SAMPLING_ERROR_THRESHOLD = 5;

function createAlert(type: Alert['type'], message: string, details?: string): Alert {
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}

export function validateAngleOfAttack(angle: number): Alert[] {
  const alerts: Alert[] = [];

  if (angle < ANGLE_MIN || angle > ANGLE_MAX) {
    alerts.push(
      createAlert(
        'error',
        `迎角越界: ${angle.toFixed(1)}°`,
        `迎角应在 ${ANGLE_MIN}° 到 ${ANGLE_MAX}° 之间，当前值已超出有效范围。计算结果可能不准确。`
      )
    );
  } else if (angle < ANGLE_WARNING_MIN || angle > ANGLE_WARNING_MAX) {
    alerts.push(
      createAlert(
        'warning',
        `迎角接近边界: ${angle.toFixed(1)}°`,
        `迎角接近有效范围边界 (${ANGLE_MIN}° ~ ${ANGLE_MAX}°)，请注意观察流动分离现象。`
      )
    );
  }

  return alerts;
}

export function validateVelocity(velocity: number): Alert[] {
  const alerts: Alert[] = [];

  if (velocity > VELOCITY_MAX) {
    alerts.push(
      createAlert(
        'error',
        `速度超限: ${velocity.toFixed(1)} m/s`,
        `速度应不超过 ${VELOCITY_MAX} m/s，当前值已超出亚音速计算模型的适用范围。`
      )
    );
  } else if (velocity >= VELOCITY_WARNING_MIN) {
    alerts.push(
      createAlert(
        'warning',
        `速度较高: ${velocity.toFixed(1)} m/s`,
        `接近音速范围，压缩性效应可能逐渐显著，计算精度会有所下降。`
      )
    );
  } else if (velocity <= VELOCITY_MIN) {
    alerts.push(
      createAlert(
        'warning',
        `速度过低: ${velocity.toFixed(1)} m/s`,
        `速度接近零，压力场变化不明显。`
      )
    );
  }

  return alerts;
}

export function validateSamplingPoints(pressureField: PressureField): Alert[] {
  const alerts: Alert[] = [];
  const invalidPoints = pressureField.samplingPoints.filter((p) => !p.isValid);

  if (invalidPoints.length > SAMPLING_ERROR_THRESHOLD) {
    alerts.push(
      createAlert(
        'error',
        `采样严重缺失: ${invalidPoints.length} 个点无效`,
        `超过 ${SAMPLING_ERROR_THRESHOLD} 个采样点数据缺失，压力场分布不完整，请检查传感器连接。`
      )
    );
  } else if (invalidPoints.length >= SAMPLING_WARNING_THRESHOLD) {
    alerts.push(
      createAlert(
        'warning',
        `采样点缺失: ${invalidPoints.length} 个点无效`,
        `部分采样点数据缺失，已跳过无效点进行颜色映射。`
      )
    );
  }

  return alerts;
}

export function validateColorInversion(pressureField: PressureField): Alert[] {
  const alerts: Alert[] = [];

  if (pressureField.colorInverted) {
    alerts.push(
      createAlert(
        'warning',
        '压力分布异常检测',
        '检测到上下表面压力分布可能反转。这可能是由于迎角过大导致流动分离，或计算参数异常。请检查数据有效性。'
      )
    );
  }

  return alerts;
}

export function validateExperiment(
  params: ExperimentParams,
  pressureField: PressureField
): ValidationResult {
  const alerts: Alert[] = [
    ...validateAngleOfAttack(params.angleOfAttack),
    ...validateVelocity(params.velocity),
    ...validateSamplingPoints(pressureField),
    ...validateColorInversion(pressureField),
  ];

  const hasErrors = alerts.some((a) => a.type === 'error');

  return {
    isValid: !hasErrors,
    alerts,
  };
}

export function getAlertColor(type: Alert['type']): string {
  switch (type) {
    case 'error':
      return 'bg-red-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'info':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
}

export function getAlertBorderColor(type: Alert['type']): string {
  switch (type) {
    case 'error':
      return 'border-red-600';
    case 'warning':
      return 'border-yellow-600';
    case 'info':
      return 'border-blue-600';
    default:
      return 'border-gray-600';
  }
}
