import { Material, ExperimentRecord } from '@/types';
import {
  convertLength,
  convertSpeed,
  convertDensity,
  convertViscosity,
  convertTemperature,
  calculateReynolds,
  calculateMach,
  calculateScaleRatio,
} from '@/utils/calculations';
import { validateExperimentRecord } from '@/utils/validation';

export const mockMaterials: Material[] = [
  {
    id: 'mat-001',
    name: '铝合金-6061',
    category: '金属',
    density: 2700,
    viscosity: 0,
    thermalConductivity: 167,
    source: '航空材料手册第3版',
  },
  {
    id: 'mat-002',
    name: '钛合金-TC4',
    category: '金属',
    density: 4430,
    viscosity: 0,
    thermalConductivity: 7.2,
    source: '航空材料手册第3版',
  },
  {
    id: 'mat-003',
    name: '碳纤维复合材料-T300',
    category: '复合材料',
    density: 1760,
    viscosity: 0,
    thermalConductivity: 6.5,
    source: '复合材料性能数据库',
  },
  {
    id: 'mat-004',
    name: '不锈钢-304',
    category: '金属',
    density: 7930,
    viscosity: 0,
    thermalConductivity: 16.2,
    source: '金属材料手册',
  },
  {
    id: 'mat-005',
    name: '环氧树脂',
    category: '塑料',
    density: 1200,
    viscosity: 0,
    thermalConductivity: 0.2,
    source: '高分子材料手册',
  },
];

const rawRecords: Omit<ExperimentRecord, 'reynoldsNumber' | 'machNumber' | 'scaleRatio' | 'status' | 'errors'>[] = [
  {
    id: 'rec-001',
    experimentNo: 'EXP-2024-001',
    date: '2024-03-15',
    materialId: 'mat-001',
    materialSource: '航空材料手册第3版',
    modelLength: 0.5,
    modelLengthUnit: 'm',
    realLength: 5,
    realLengthUnit: 'm',
    windSpeed: 50,
    windSpeedUnit: 'm/s',
    airDensity: 1.225,
    airDensityUnit: 'kg/m³',
    airViscosity: 1.81e-5,
    airViscosityUnit: 'Pa·s',
    temperature: 288.15,
    temperatureUnit: 'K',
  },
  {
    id: 'rec-002',
    experimentNo: 'EXP-2024-002',
    date: '2024-03-16',
    materialId: 'mat-001',
    materialSource: '航空材料手册第3版',
    modelLength: 500,
    modelLengthUnit: 'mm',
    realLength: 5,
    realLengthUnit: 'm',
    windSpeed: 50,
    windSpeedUnit: 'm/s',
    airDensity: 1.225,
    airDensityUnit: 'kg/m³',
    airViscosity: 1.81e-5,
    airViscosityUnit: 'Pa·s',
    temperature: 15,
    temperatureUnit: '°C',
  },
  {
    id: 'rec-003',
    experimentNo: 'EXP-2024-003',
    date: '2024-03-17',
    materialId: 'mat-002',
    materialSource: '航空材料手册第3版',
    modelLength: 0.2,
    modelLengthUnit: 'm',
    realLength: 10,
    realLengthUnit: 'm',
    windSpeed: 5,
    windSpeedUnit: 'm/s',
    airDensity: 1.225,
    airDensityUnit: 'kg/m³',
    airViscosity: 1.81e-5,
    airViscosityUnit: 'Pa·s',
    temperature: 288.15,
    temperatureUnit: 'K',
  },
  {
    id: 'rec-004',
    experimentNo: 'EXP-2024-004',
    date: '2024-03-18',
    materialId: 'mat-003',
    materialSource: '复合材料性能数据库',
    modelLength: 0.3,
    modelLengthUnit: 'm',
    realLength: 3,
    realLengthUnit: 'm',
    windSpeed: 120,
    windSpeedUnit: 'm/s',
    airDensity: 1.225,
    airDensityUnit: 'kg/m³',
    airViscosity: 1.81e-5,
    airViscosityUnit: 'Pa·s',
    temperature: 288.15,
    temperatureUnit: 'K',
  },
  {
    id: 'rec-005',
    experimentNo: 'EXP-2024-005',
    date: '2024-03-19',
    materialId: 'mat-004',
    materialSource: '金属材料手册',
    modelLength: 10,
    modelLengthUnit: 'm',
    realLength: 5,
    realLengthUnit: 'm',
    windSpeed: 50,
    windSpeedUnit: 'm/s',
    airDensity: 1.225,
    airDensityUnit: 'kg/m³',
    airViscosity: 1.81e-5,
    airViscosityUnit: 'Pa·s',
    temperature: 288.15,
    temperatureUnit: 'K',
  },
  {
    id: 'rec-006',
    experimentNo: 'EXP-2024-006',
    date: '2024-03-20',
    materialId: 'mat-001',
    materialSource: '航空材料手册第3版',
    modelLength: 0.5,
    modelLengthUnit: 'm',
    realLength: 5,
    realLengthUnit: 'm',
    windSpeed: 180,
    windSpeedUnit: 'km/h',
    airDensity: 0.001225,
    airDensityUnit: 'g/cm³',
    airViscosity: 0.0181,
    airViscosityUnit: 'cP',
    temperature: 59,
    temperatureUnit: '°F',
  },
  {
    id: 'rec-007',
    experimentNo: 'EXP-2024-007',
    date: '2024-03-21',
    materialId: 'mat-005',
    materialSource: '高分子材料手册',
    modelLength: 0.1,
    modelLengthUnit: 'm',
    realLength: 2,
    realLengthUnit: 'm',
    windSpeed: 200,
    windSpeedUnit: 'm/s',
    airDensity: 1.225,
    airDensityUnit: 'kg/m³',
    airViscosity: 1.81e-5,
    airViscosityUnit: 'Pa·s',
    temperature: 288.15,
    temperatureUnit: 'K',
  },
  {
    id: 'rec-008',
    experimentNo: 'EXP-2024-008',
    date: '2024-03-22',
    materialId: 'mat-002',
    materialSource: '航空材料手册第3版',
    modelLength: 0.25,
    modelLengthUnit: 'm',
    realLength: 10,
    realLengthUnit: 'm',
    windSpeed: 80,
    windSpeedUnit: 'm/s',
    airDensity: 1.225,
    airDensityUnit: 'kg/m³',
    airViscosity: 1.81e-5,
    airViscosityUnit: 'Pa·s',
    temperature: 288.15,
    temperatureUnit: 'K',
  },
];

function processRecord(raw: typeof rawRecords[0]): ExperimentRecord {
  const modelLengthM = convertLength(raw.modelLength, raw.modelLengthUnit, 'm');
  const realLengthM = convertLength(raw.realLength, raw.realLengthUnit, 'm');
  const windSpeedMs = convertSpeed(raw.windSpeed, raw.windSpeedUnit, 'm/s');
  const airDensitySi = convertDensity(raw.airDensity, raw.airDensityUnit, 'kg/m³');
  const airViscositySi = convertViscosity(raw.airViscosity, raw.airViscosityUnit, 'Pa·s');
  const temperatureK = convertTemperature(raw.temperature, raw.temperatureUnit, 'K');

  const reynolds = calculateReynolds(airDensitySi, windSpeedMs, modelLengthM, airViscositySi);
  const mach = calculateMach(windSpeedMs, temperatureK);
  const scaleRatio = calculateScaleRatio(modelLengthM, realLengthM);

  const tempRecord: ExperimentRecord = {
    ...raw,
    reynoldsNumber: reynolds,
    machNumber: mach,
    scaleRatio,
    status: 'valid',
    errors: [],
  };

  const errors = validateExperimentRecord(tempRecord);
  const status: 'valid' | 'error' | 'warning' = errors.some(e => e.severity === 'error')
    ? 'error'
    : errors.some(e => e.severity === 'warning')
    ? 'warning'
    : 'valid';

  return {
    ...tempRecord,
    errors,
    status,
  };
}

export const mockRecords: ExperimentRecord[] = rawRecords.map(processRecord);
