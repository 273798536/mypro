import { CalculationParameters } from '@/types/experiment';

export const PARAMETER_LEVELS: Record<string, Partial<CalculationParameters>> = {
  level1: {
    airDensity: 1.225,
    windSpeed: 30,
    angleOfAttack: 0,
    smokeLineDiameter: 0.1,
    turbulenceIntensity: 0.5,
  },
  level2: {
    airDensity: 1.225,
    windSpeed: 50,
    angleOfAttack: 5,
    smokeLineDiameter: 0.15,
    turbulenceIntensity: 1.0,
  },
  level3: {
    airDensity: 1.225,
    windSpeed: 80,
    angleOfAttack: 10,
    smokeLineDiameter: 0.2,
    turbulenceIntensity: 2.0,
  },
};

export const PARAMETER_RANGES: Record<keyof CalculationParameters, { min: number; max: number; step: number; unit: string }> = {
  airDensity: {
    min: 0.5,
    max: 2.0,
    step: 0.01,
    unit: 'kg/m³',
  },
  windSpeed: {
    min: 10,
    max: 150,
    step: 1,
    unit: 'm/s',
  },
  angleOfAttack: {
    min: -20,
    max: 45,
    step: 0.5,
    unit: '°',
  },
  smokeLineDiameter: {
    min: 0.05,
    max: 1.0,
    step: 0.01,
    unit: 'mm',
  },
  turbulenceIntensity: {
    min: 0.1,
    max: 10,
    step: 0.1,
    unit: '%',
  },
  parameterLevel: {
    min: 0,
    max: 3,
    step: 1,
    unit: '',
  },
};

export const PARAMETER_LABELS: Record<keyof CalculationParameters, string> = {
  airDensity: '空气密度',
  windSpeed: '风速',
  angleOfAttack: '攻角',
  smokeLineDiameter: '烟线直径',
  turbulenceIntensity: '湍流强度',
  parameterLevel: '参数档位',
};

export const DEFAULT_PARAMETERS: CalculationParameters = {
  airDensity: 1.225,
  windSpeed: 50,
  angleOfAttack: 5,
  smokeLineDiameter: 0.1,
  turbulenceIntensity: 0.5,
  parameterLevel: 'level2',
};

export const LEVEL_LABELS: Record<string, string> = {
  level1: '一档（低风速）',
  level2: '二档（中风速）',
  level3: '三档（高风速）',
  custom: '自定义',
};
