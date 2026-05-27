export type TemperatureUnit = 'celsius' | 'kelvin' | 'fahrenheit';

export type ValidationLevel = 'info' | 'warning' | 'error';

export type SensorStatus = 'normal' | 'warning' | 'error';

export type OperatorType = 'user' | 'system' | 'correction';

export type PageType = 'main' | 'report';

export interface Material {
  id: string;
  name: string;
  emissivity: number;
  dataSource: string;
}

export interface HeatSource {
  id: string;
  temperature: number;
  temperatureUnit: TemperatureUnit;
  area: number;
  position: [number, number, number];
  material: Material;
  dataSource: string;
}

export interface Sensor {
  id: string;
  position: [number, number, number];
  measuredIntensity: number;
  distance: number;
  status: SensorStatus;
  calibrationSource: string;
}

export interface ValidationResult {
  valid: boolean;
  level: ValidationLevel;
  message: string;
  correction?: string;
  parameterName: string;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  parameterName: string;
  oldValue: unknown;
  newValue: unknown;
  unit?: string;
  isValid: boolean;
  validationMessage?: string;
  operator: OperatorType;
  correctionNote?: string;
  dataSource?: string;
}

export interface Snapshot {
  id: string;
  imageData: string;
  timestamp: number;
  heatSource: HeatSource;
  sensor: Sensor;
  intensity: number;
  validationResults: ValidationResult[];
}

export interface ColorStop {
  position: number;
  color: string;
}

export interface RadiationField {
  intensity: number;
  colorStops: ColorStop[];
  distortionStatus: 'normal' | 'warning' | 'distorted';
}

export interface PhysicsConstants {
  STEFAN_BOLTZMANN: number;
  MIN_DISTANCE: number;
  MAX_TEMPERATURE_K: number;
  MIN_TEMPERATURE_K: number;
  DEFAULT_EMISSIVITY: number;
}

export const PHYSICS_CONSTANTS: PhysicsConstants = {
  STEFAN_BOLTZMANN: 5.670374419e-8,
  MIN_DISTANCE: 0.001,
  MAX_TEMPERATURE_K: 6000,
  MIN_TEMPERATURE_K: 0,
  DEFAULT_EMISSIVITY: 0.95,
} as const;

export const MATERIALS: Material[] = [
  {
    id: 'black-body',
    name: '黑体',
    emissivity: 1.0,
    dataSource: '物理标准定义 - 理想辐射体',
  },
  {
    id: 'polished-aluminum',
    name: '抛光铝',
    emissivity: 0.04,
    dataSource: '工程材料手册 - 金属热辐射参数',
  },
  {
    id: 'oxidized-steel',
    name: '氧化钢',
    emissivity: 0.8,
    dataSource: '工程材料手册 - 金属热辐射参数',
  },
  {
    id: 'concrete',
    name: '混凝土',
    emissivity: 0.94,
    dataSource: '建筑材料热物理参数表',
  },
  {
    id: 'human-skin',
    name: '人体皮肤',
    emissivity: 0.98,
    dataSource: '生物物理研究 - 人体热辐射特性',
  },
  {
    id: 'water',
    name: '水',
    emissivity: 0.96,
    dataSource: '热力学数据手册',
  },
  {
    id: 'carbon',
    name: '碳/石墨',
    emissivity: 0.95,
    dataSource: '材料科学数据库',
  },
];

export const UNIT_LABELS: Record<TemperatureUnit, string> = {
  celsius: '°C',
  kelvin: 'K',
  fahrenheit: '°F',
};
