import { ExperimentRecord, ValidationError, ScaleFormData } from '@/types';
import {
  convertLength,
  convertSpeed,
  convertDensity,
  convertViscosity,
  convertTemperature,
  calculateReynolds,
  calculateMach,
  calculateScaleRatio,
} from './calculations';

const TARGET_REYNOLDS_MIN = 1e5;
const TARGET_REYNOLDS_MAX = 1e7;
const MACH_COMPRESSIBILITY_THRESHOLD = 0.3;

export function validateExperimentRecord(record: ExperimentRecord): ValidationError[] {
  const errors: ValidationError[] = [];
  const materialInfo = `材料: ${record.materialSource}, 记录: ${record.experimentNo}`;

  if (record.modelLength <= 0) {
    errors.push({
      type: 'invalid_value',
      severity: 'error',
      message: '模型长度必须大于0',
      location: materialInfo,
      field: 'modelLength',
    });
  }

  if (record.realLength <= 0) {
    errors.push({
      type: 'invalid_value',
      severity: 'error',
      message: '实机长度必须大于0',
      location: materialInfo,
      field: 'realLength',
    });
  }

  if (record.windSpeed <= 0) {
    errors.push({
      type: 'invalid_value',
      severity: 'error',
      message: '风速必须大于0',
      location: materialInfo,
      field: 'windSpeed',
    });
  }

  if (record.airDensity <= 0) {
    errors.push({
      type: 'invalid_value',
      severity: 'error',
      message: '空气密度必须大于0',
      location: materialInfo,
      field: 'airDensity',
    });
  }

  if (record.airViscosity <= 0) {
    errors.push({
      type: 'invalid_value',
      severity: 'error',
      message: '空气粘度必须大于0',
      location: materialInfo,
      field: 'airViscosity',
    });
  }

  if (record.temperatureUnit === 'K' && record.temperature <= 0) {
    errors.push({
      type: 'invalid_value',
      severity: 'error',
      message: '开尔文温度必须大于0',
      location: materialInfo,
      field: 'temperature',
    });
  }

  if (record.temperatureUnit === '°C' && record.temperature < -273.15) {
    errors.push({
      type: 'invalid_value',
      severity: 'error',
      message: '摄氏度不能低于绝对零度(-273.15°C)',
      location: materialInfo,
      field: 'temperature',
    });
  }

  if (record.modelLengthUnit === record.realLengthUnit) {
    if (record.modelLength >= record.realLength) {
      errors.push({
        type: 'unit_mismatch',
        severity: 'warning',
        message: `单位一致但模型长度(${record.modelLength}${record.modelLengthUnit}) >= 实机长度(${record.realLength}${record.realLengthUnit})，这是放大模型而非缩比模型`,
        location: materialInfo,
        field: 'modelLength',
      });
    }
  } else {
    const modelLengthM = convertLength(record.modelLength, record.modelLengthUnit, 'm');
    const realLengthM = convertLength(record.realLength, record.realLengthUnit, 'm');
    if (modelLengthM >= realLengthM) {
      errors.push({
        type: 'unit_mismatch',
        severity: 'warning',
        message: `单位转换后模型长度(${modelLengthM.toFixed(4)}m) >= 实机长度(${realLengthM.toFixed(4)}m)，这是放大模型而非缩比模型`,
        location: materialInfo,
        field: 'modelLengthUnit',
      });
    }
  }

  const modelLengthM = convertLength(record.modelLength, record.modelLengthUnit, 'm');
  const windSpeedMs = convertSpeed(record.windSpeed, record.windSpeedUnit, 'm/s');
  const airDensitySi = convertDensity(record.airDensity, record.airDensityUnit, 'kg/m³');
  const airViscositySi = convertViscosity(record.airViscosity, record.airViscosityUnit, 'Pa·s');
  const temperatureK = convertTemperature(record.temperature, record.temperatureUnit, 'K');

  const reynolds = calculateReynolds(airDensitySi, windSpeedMs, modelLengthM, airViscositySi);
  const mach = calculateMach(windSpeedMs, temperatureK);

  if (reynolds > 0 && (reynolds < TARGET_REYNOLDS_MIN || reynolds > TARGET_REYNOLDS_MAX)) {
    errors.push({
      type: 'reynolds_mismatch',
      severity: 'error',
      message: `雷诺数 Re = ${reynolds.toExponential(2)} 不在推荐范围 [${TARGET_REYNOLDS_MIN.toExponential(0)}, ${TARGET_REYNOLDS_MAX.toExponential(0)}] 内，流动相似性无法保证`,
      location: materialInfo,
      field: 'reynoldsNumber',
    });
  }

  if (mach > MACH_COMPRESSIBILITY_THRESHOLD) {
    errors.push({
      type: 'mach_mismatch',
      severity: 'warning',
      message: `马赫数 Ma = ${mach.toFixed(3)} > ${MACH_COMPRESSIBILITY_THRESHOLD}，已进入亚声速可压缩区，需同时保证马赫数相似`,
      location: materialInfo,
      field: 'machNumber',
    });
  }

  if (reynolds > 0 && mach > 0 && mach > MACH_COMPRESSIBILITY_THRESHOLD) {
    errors.push({
      type: 'reynolds_mismatch',
      severity: 'error',
      message: `同时存在雷诺数 Re=${reynolds.toExponential(2)} 和马赫数 Ma=${mach.toFixed(3)} 相似要求，常规风洞难以同时满足，需采用特殊实验技术`,
      location: materialInfo,
      field: 'reynoldsNumber',
    });
  }

  return errors;
}

export function validateScaleForm(data: ScaleFormData, materialName: string = '当前输入'): ValidationError[] {
  const record: ExperimentRecord = {
    id: 'temp',
    experimentNo: '临时计算',
    date: new Date().toISOString().split('T')[0],
    materialId: 'temp',
    materialSource: materialName,
    ...data,
    reynoldsNumber: null,
    machNumber: null,
    scaleRatio: null,
    status: 'valid',
    errors: [],
  };
  return validateExperimentRecord(record);
}

export function calculateAndValidate(data: ScaleFormData, materialName: string = '当前输入') {
  const modelLengthM = convertLength(data.modelLength, data.modelLengthUnit, 'm');
  const realLengthM = convertLength(data.realLength, data.realLengthUnit, 'm');
  const windSpeedMs = convertSpeed(data.windSpeed, data.windSpeedUnit, 'm/s');
  const airDensitySi = convertDensity(data.airDensity, data.airDensityUnit, 'kg/m³');
  const airViscositySi = convertViscosity(data.airViscosity, data.airViscosityUnit, 'Pa·s');
  const temperatureK = convertTemperature(data.temperature, data.temperatureUnit, 'K');

  const reynolds = calculateReynolds(airDensitySi, windSpeedMs, modelLengthM, airViscositySi);
  const mach = calculateMach(windSpeedMs, temperatureK);
  const scaleRatio = calculateScaleRatio(modelLengthM, realLengthM);

  const errors = validateScaleForm(data, materialName);
  const status: 'valid' | 'error' | 'warning' = errors.some(e => e.severity === 'error')
    ? 'error'
    : errors.some(e => e.severity === 'warning')
    ? 'warning'
    : 'valid';

  return {
    reynolds,
    mach,
    scaleRatio,
    errors,
    status,
    modelLengthM,
    realLengthM,
    windSpeedMs,
    airDensitySi,
    airViscositySi,
    temperatureK,
  };
}
