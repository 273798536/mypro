import { UNIT_CONVERSIONS } from '@/data/formulas';

export type AreaUnit = 'mm²' | 'μm²' | 'cm²';
export type LengthUnit = 'mm' | 'μm' | 'cm';
export type TimeUnit = 'h' | 'min' | 's';
export type RateUnit = '%/h' | '%/min' | '%/s';

export interface ConversionResult {
  value: number;
  unit: string;
  isValid: boolean;
  message?: string;
}

export function convertArea(
  value: number,
  fromUnit: AreaUnit,
  toUnit: AreaUnit
): ConversionResult {
  if (value < 0) {
    return { value: 0, unit: toUnit, isValid: false, message: '面积值不能为负数' };
  }

  const toMm2: Record<AreaUnit, number> = {
    'mm²': 1,
    'μm²': 1e-6,
    'cm²': 100
  };

  const valueInMm2 = value * toMm2[fromUnit];
  const convertedValue = valueInMm2 / toMm2[toUnit];

  return {
    value: parseFloat(convertedValue.toExponential(4)),
    unit: toUnit,
    isValid: true
  };
}

export function convertLength(
  value: number,
  fromUnit: LengthUnit,
  toUnit: LengthUnit
): ConversionResult {
  if (value < 0) {
    return { value: 0, unit: toUnit, isValid: false, message: '长度值不能为负数' };
  }

  const toMm: Record<LengthUnit, number> = {
    'mm': 1,
    'μm': 0.001,
    'cm': 10
  };

  const valueInMm = value * toMm[fromUnit];
  const convertedValue = valueInMm / toMm[toUnit];

  return {
    value: parseFloat(convertedValue.toFixed(4)),
    unit: toUnit,
    isValid: true
  };
}

export function convertTime(
  value: number,
  fromUnit: TimeUnit,
  toUnit: TimeUnit
): ConversionResult {
  if (value < 0) {
    return { value: 0, unit: toUnit, isValid: false, message: '时间值不能为负数' };
  }

  const toMinutes: Record<TimeUnit, number> = {
    'h': 60,
    'min': 1,
    's': 1 / 60
  };

  const valueInMin = value * toMinutes[fromUnit];
  const convertedValue = valueInMin / toMinutes[toUnit];

  return {
    value: parseFloat(convertedValue.toFixed(4)),
    unit: toUnit,
    isValid: true
  };
}

export function convertRate(
  value: number,
  fromUnit: RateUnit,
  toUnit: RateUnit
): ConversionResult {
  if (value < 0) {
    return { value: 0, unit: toUnit, isValid: false, message: '速率值不能为负数' };
  }

  const toPerHour: Record<RateUnit, number> = {
    '%/h': 1,
    '%/min': 60,
    '%/s': 3600
  };

  const valuePerHour = value * toPerHour[fromUnit];
  const convertedValue = valuePerHour / toPerHour[toUnit];

  return {
    value: parseFloat(convertedValue.toFixed(4)),
    unit: toUnit,
    isValid: true
  };
}

export function calculateCalibrationFactor(
  objectiveMagnification: number,
  cameraPixelSize: number,
  binning: number = 1
): { factor: number; unit: string; isValid: boolean; message?: string } {
  if (objectiveMagnification <= 0) {
    return { factor: 0, unit: 'mm²/pixel', isValid: false, message: '物镜倍数必须大于0' };
  }
  if (cameraPixelSize <= 0) {
    return { factor: 0, unit: 'mm²/pixel', isValid: false, message: '相机像素尺寸必须大于0' };
  }
  if (binning <= 0) {
    return { factor: 0, unit: 'mm²/pixel', isValid: false, message: 'Binning值必须大于0' };
  }

  const pixelSizeInMm = (cameraPixelSize * binning) / objectiveMagnification / 1000;
  const calibrationFactor = Math.pow(pixelSizeInMm, 2);

  return {
    factor: parseFloat(calibrationFactor.toExponential(6)),
    unit: 'mm²/pixel',
    isValid: true
  };
}

export function formatValueWithUnit(
  value: number,
  unit: string,
  decimalPlaces: number = 2
): string {
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 0.001 && value !== 0)) {
    return `${value.toExponential(decimalPlaces)} ${unit}`;
  }
  return `${value.toFixed(decimalPlaces)} ${unit}`;
}

export function parseValueWithUnit(input: string): { value: number; unit: string; isValid: boolean } {
  const match = input.match(/^([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*([\w°%²³/]+)?$/);

  if (!match) {
    return { value: 0, unit: '', isValid: false };
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || '';

  return { value, unit, isValid: true };
}

export const AREA_UNITS: AreaUnit[] = ['mm²', 'μm²', 'cm²'];
export const LENGTH_UNITS: LengthUnit[] = ['mm', 'μm', 'cm'];
export const TIME_UNITS: TimeUnit[] = ['h', 'min', 's'];
export const RATE_UNITS: RateUnit[] = ['%/h', '%/min', '%/s'];

export const UNIT_LABELS: Record<string, string> = {
  'mm²': '平方毫米',
  'μm²': '平方微米',
  'cm²': '平方厘米',
  'mm': '毫米',
  'μm': '微米',
  'cm': '厘米',
  'h': '小时',
  'min': '分钟',
  's': '秒',
  '%/h': '每小时百分比',
  '%/min': '每分钟百分比',
  '%/s': '每秒百分比',
  'mm²/pixel': '平方毫米每像素'
};
