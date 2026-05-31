import { CalibrationConfig } from '../types';
import { MATERIAL_CORRECTION_FACTORS } from './materials';

export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
  referenceTemperature: 20,
  soundSpeedAtRef: 343.2,
  anomalyThreshold: 1.5,
  enableMultiEchoDetection: true,
  autoUnitConversion: true,
  materialCorrectionFactors: MATERIAL_CORRECTION_FACTORS,
  multiEchoTimeThreshold: 100,
  multiEchoDistanceTolerance: 0.05,
};

export const SOUND_SPEED_BASE = 331.3;
export const SOUND_SPEED_TEMP_COEFF = 0.606;
export const REFERENCE_TEMPERATURE_K = 273.15;

export const UNIT_CONVERSION_FACTORS = {
  distance: {
    m: 1,
    cm: 0.01,
    mm: 0.001,
    ft: 0.3048,
  },
};

export const NORMAL_TEMPERATURE_RANGE: [number, number] = [-10, 50];

export const STAGE_LABELS: Record<string, string> = {
  phase1: '第一阶段：测距+温度数据',
  phase2: '第二阶段：补录反射面材质',
};
