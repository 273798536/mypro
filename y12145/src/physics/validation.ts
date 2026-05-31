import type { SolarSailParams, ValidationRecord } from '@/types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function validateSailArea(area: number): ValidationRecord | null {
  const record: ValidationRecord = {
    id: generateId(),
    timestamp: Date.now(),
    parameter: 'sailArea',
    value: area,
    source: 'src/physics/validation.ts:validateSailArea',
    isValid: true,
    type: 'normal',
    message: ''
  };

  if (area <= 0) {
    record.isValid = false;
    record.type = 'warning';
    record.message = `帆面积 ${area.toFixed(2)} m² 必须大于零，光压计算结果可能不准确`;
    return record;
  }

  if (area > 10000) {
    record.isValid = false;
    record.type = 'warning';
    record.message = `帆面积 ${area.toFixed(2)} m² 超出常规范围(0-10000 m²)，请确认输入`;
    return record;
  }

  record.message = `帆面积 ${area.toFixed(2)} m² 在有效范围内`;
  return record;
}

export function validateSpacecraftMass(mass: number): ValidationRecord | null {
  const record: ValidationRecord = {
    id: generateId(),
    timestamp: Date.now(),
    parameter: 'spacecraftMass',
    value: mass,
    source: 'src/physics/validation.ts:validateSpacecraftMass',
    isValid: true,
    type: 'normal',
    message: ''
  };

  if (mass <= 0) {
    record.isValid = false;
    record.type = 'error';
    record.message = `航天器质量 ${mass.toExponential(2)} kg 必须大于零，加速度计算将除零错误`;
    return record;
  }

  if (mass > 10000) {
    record.isValid = false;
    record.type = 'warning';
    record.message = `航天器质量 ${mass.toFixed(2)} kg 较大，光压加速效果可能不明显`;
    return record;
  }

  record.message = `航天器质量 ${mass.toFixed(2)} kg 在有效范围内`;
  return record;
}

export function validateAttitudeAngle(angle: number): ValidationRecord | null {
  const record: ValidationRecord = {
    id: generateId(),
    timestamp: Date.now(),
    parameter: 'attitudeAngle',
    value: angle,
    source: 'src/physics/validation.ts:validateAttitudeAngle',
    isValid: true,
    type: 'normal',
    message: ''
  };

  if (angle < 0 || angle > 90) {
    record.isValid = false;
    record.type = 'error';
    record.message = `姿态角 ${angle.toFixed(1)}° 越界，有效范围为 0°-90°`;
    return record;
  }

  record.message = `姿态角 ${angle.toFixed(1)}° 在有效范围内`;
  return record;
}

export function validateTimeStep(timeStep: number): ValidationRecord | null {
  const record: ValidationRecord = {
    id: generateId(),
    timestamp: Date.now(),
    parameter: 'timeStep',
    value: timeStep,
    source: 'src/physics/validation.ts:validateTimeStep',
    isValid: true,
    type: 'normal',
    message: ''
  };

  if (timeStep <= 0) {
    record.isValid = false;
    record.type = 'error';
    record.message = `时间步长 ${timeStep.toFixed(1)} s 必须大于零`;
    return record;
  }

  if (timeStep > 3600) {
    record.isValid = false;
    record.type = 'warning';
    record.message = `时间步长 ${timeStep.toFixed(1)} s 过大，轨道积分精度可能降低`;
    return record;
  }

  record.message = `时间步长 ${timeStep.toFixed(1)} s 在有效范围内`;
  return record;
}

export function validateAllParams(params: SolarSailParams): ValidationRecord[] {
  const records: ValidationRecord[] = [];
  
  const sailAreaRecord = validateSailArea(params.sailArea);
  if (sailAreaRecord) records.push(sailAreaRecord);
  
  const massRecord = validateSpacecraftMass(params.spacecraftMass);
  if (massRecord) records.push(massRecord);
  
  const angleRecord = validateAttitudeAngle(params.attitudeAngle);
  if (angleRecord) records.push(angleRecord);
  
  const timeStepRecord = validateTimeStep(params.timeStep);
  if (timeStepRecord) records.push(timeStepRecord);
  
  return records;
}

export function hasCriticalErrors(records: ValidationRecord[]): boolean {
  return records.some(r => r.type === 'error' && !r.isValid);
}
