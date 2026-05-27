import { RideInput, ValidationResult, ValidationIssue, DEFAULT_PHYSICS } from '@/types';
import { calculateGearRatio, calculateSpeed } from './powerCalculator';

function generateId(): string {
  return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function validateRideInput(input: RideInput): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (input.chainringTeeth <= 0) {
    errors.push({
      id: generateId(),
      type: 'error',
      field: 'chainringTeeth',
      code: 'CHAINRING_INVALID',
      message: '牙盘齿数必须大于0',
      suggestion: '请输入正确的牙盘齿数，通常在30-56之间',
      autoFix: { chainringTeeth: 50 },
    });
  } else if (input.chainringTeeth < 30 || input.chainringTeeth > 60) {
    warnings.push({
      id: generateId(),
      type: 'warning',
      field: 'chainringTeeth',
      code: 'CHAINRING_OUT_OF_RANGE',
      message: `牙盘齿数 ${input.chainringTeeth} 不在常见范围（30-60）内`,
      suggestion: '请确认牙盘齿数是否正确，标准公路车通常为50-53T',
    });
  }

  if (input.cogTeeth <= 0) {
    errors.push({
      id: generateId(),
      type: 'error',
      field: 'cogTeeth',
      code: 'COG_INVALID',
      message: '飞轮齿数必须大于0',
      suggestion: '请输入正确的飞轮齿数，通常在11-32之间',
      autoFix: { cogTeeth: 14 },
    });
  } else if (input.cogTeeth < 10 || input.cogTeeth > 40) {
    warnings.push({
      id: generateId(),
      type: 'warning',
      field: 'cogTeeth',
      code: 'COG_OUT_OF_RANGE',
      message: `飞轮齿数 ${input.cogTeeth} 不在常见范围（10-40）内`,
      suggestion: '请确认飞轮齿数是否正确，标准公路车飞轮通常为11-32T',
    });
  }

  const gearRatio = calculateGearRatio(input.chainringTeeth, input.cogTeeth);
  if (gearRatio < 0.5 || gearRatio > 6.0) {
    errors.push({
      id: generateId(),
      type: 'error',
      field: 'chainringTeeth',
      code: 'GEAR_RATIO_OUT_OF_RANGE',
      message: `齿比 ${gearRatio.toFixed(2)} 超出合理范围（0.5-6.0）`,
      suggestion: '请检查牙盘和飞轮齿数是否正确',
    });
  } else if (gearRatio < 1.0 || gearRatio > 5.0) {
    warnings.push({
      id: generateId(),
      type: 'warning',
      field: 'chainringTeeth',
      code: 'GEAR_RATIO_BOUNDARY',
      message: `齿比 ${gearRatio.toFixed(2)} 接近边界范围`,
      suggestion: '齿比通常在1.0-5.0之间，请确认数据是否正确',
    });
  }

  if (input.cadence <= 0) {
    errors.push({
      id: generateId(),
      type: 'error',
      field: 'cadence',
      code: 'CADENCE_INVALID',
      message: '踏频必须大于0',
      suggestion: '请输入正确的踏频值（RPM）',
      autoFix: { cadence: 90 },
    });
  } else if (input.cadence < 30 || input.cadence > 180) {
    warnings.push({
      id: generateId(),
      type: 'warning',
      field: 'cadence',
      code: 'CADENCE_ABNORMAL',
      message: `踏频 ${input.cadence} RPM 超出正常骑行范围`,
      suggestion: '正常骑行踏频通常在60-120 RPM之间，请确认数据',
    });
  }

  if (input.riderWeight <= 0) {
    errors.push({
      id: generateId(),
      type: 'error',
      field: 'riderWeight',
      code: 'RIDER_WEIGHT_INVALID',
      message: '骑手体重必须大于0',
      suggestion: '请输入正确的体重（kg）',
      autoFix: { riderWeight: 70 },
    });
  } else if (input.riderWeight < 30 || input.riderWeight > 150) {
    warnings.push({
      id: generateId(),
      type: 'warning',
      field: 'riderWeight',
      code: 'RIDER_WEIGHT_OUT_OF_RANGE',
      message: `体重 ${input.riderWeight}kg 不在常见范围（30-150）内`,
      suggestion: '请确认体重数据是否正确',
    });
  }

  if (input.bikeWeight < 0) {
    errors.push({
      id: generateId(),
      type: 'error',
      field: 'bikeWeight',
      code: 'BIKE_WEIGHT_INVALID',
      message: '车重不能为负数',
      suggestion: '请输入正确的车重（kg）',
      autoFix: { bikeWeight: 8 },
    });
  } else if (input.bikeWeight > 20) {
    warnings.push({
      id: generateId(),
      type: 'warning',
      field: 'bikeWeight',
      code: 'BIKE_WEIGHT_HIGH',
      message: `车重 ${input.bikeWeight}kg 偏重`,
      suggestion: '标准公路车通常在6-10kg之间，请确认数据',
    });
  }

  if (input.slopeUnit === 'percent' && Math.abs(input.slope) > 45) {
    errors.push({
      id: generateId(),
      type: 'error',
      field: 'slope',
      code: 'SLOPE_UNIT_ERROR',
      message: `坡度 ${input.slope}% 超出合理范围`,
      suggestion: '坡度百分比通常在-30%到+30%之间，可能是单位错误（应为角度）',
      autoFix: { slopeUnit: 'degree' },
    });
  } else if (input.slopeUnit === 'degree' && Math.abs(input.slope) > 30) {
    errors.push({
      id: generateId(),
      type: 'error',
      field: 'slope',
      code: 'SLOPE_DEGREE_TOO_LARGE',
      message: `坡度 ${input.slope}° 超出合理范围`,
      suggestion: '坡度角度通常在-15°到+15°之间，请确认数据',
    });
  } else if (input.slopeUnit === 'percent' && Math.abs(input.slope) > 25) {
    warnings.push({
      id: generateId(),
      type: 'warning',
      field: 'slope',
      code: 'SLOPE_PERCENT_HIGH',
      message: `坡度 ${input.slope}% 非常陡峭`,
      suggestion: '请确认坡度数据是否正确，世界级爬坡通常不超过15%',
    });
  }

  if (input.windSpeed < 0) {
    errors.push({
      id: generateId(),
      type: 'error',
      field: 'windSpeed',
      code: 'WIND_SPEED_NEGATIVE',
      message: '风速不能为负数',
      suggestion: '风速应为正值，风向单独选择',
      autoFix: { windSpeed: Math.abs(input.windSpeed) },
    });
  }

  const speed = calculateSpeed(gearRatio, input.cadence, DEFAULT_PHYSICS.wheelCircumference);
  if (speed > 25 && input.windSpeed === 0 && input.slope <= 0) {
    warnings.push({
      id: generateId(),
      type: 'warning',
      field: 'windSpeed',
      code: 'WIND_MISSING_AT_HIGH_SPEED',
      message: `速度 ${speed.toFixed(1)} km/h 但风速为0`,
      suggestion: '高速骑行时通常存在风阻，建议确认是否漏填风速数据',
    });
  }

  if (speed > 55) {
    warnings.push({
      id: generateId(),
      type: 'warning',
      field: 'cadence',
      code: 'SPEED_TOO_HIGH',
      message: `计算速度 ${speed.toFixed(1)} km/h 异常高`,
      suggestion: '请确认齿比和踏频数据是否正确',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getFieldStatus(
  field: keyof RideInput,
  validation: ValidationResult
): 'normal' | 'error' | 'warning' {
  const hasError = validation.errors.some(e => e.field === field);
  if (hasError) return 'error';
  const hasWarning = validation.warnings.some(w => w.field === field);
  if (hasWarning) return 'warning';
  return 'normal';
}
