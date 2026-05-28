export interface SimulationParams {
  id: string;
  source: string;
  timestamp: number;
  radius: number;
  airDensity: number;
  dragCoefficient: number;
  initialVelocity: number;
  height: number;
  modificationHistory: ModificationRecord[];
}

export interface ModificationRecord {
  timestamp: number;
  field: string;
  oldValue: number;
  newValue: number;
  reason: string;
}

export interface SimulationResult {
  timeSeries: number[];
  velocitySeries: number[];
  positionSeries: number[];
  terminalVelocity: number;
  timeToTerminal: number;
  timeToGround: number;
  anomalies: AnomalyRecord[];
  status: 'running' | 'completed' | 'error' | 'divergent';
}

export type AnomalyType = 'unit_error' | 'velocity_divergence' | 'model_not_applicable' | 'parameter_out_of_range';

export interface AnomalyRecord {
  type: AnomalyType;
  severity: 'warning' | 'error';
  message: string;
  suggestion: string;
  timestamp: number;
}

export interface SampleData {
  name: string;
  description: string;
  params: Omit<SimulationParams, 'id' | 'timestamp' | 'modificationHistory'>;
}

export const PHYSICAL_CONSTANTS = {
  WATER_DENSITY: 1000,
  GRAVITY: 9.81,
  STANDARD_AIR_DENSITY: 1.225,
  SPHERE_DRAG_COEFFICIENT: 0.47,
} as const;

export const PARAMETER_RANGES = {
  radius: { min: 0.05, max: 6, unit: 'mm', label: '雨滴半径' },
  airDensity: { min: 0.5, max: 1.5, unit: 'kg/m³', label: '空气密度' },
  dragCoefficient: { min: 0.2, max: 1.0, unit: '', label: '阻力系数' },
  initialVelocity: { min: -50, max: 50, unit: 'm/s', label: '初速度' },
  height: { min: 1, max: 10000, unit: 'm', label: '下落高度' },
} as const;

export const ANOMALY_MESSAGES: Record<AnomalyType, { message: string; suggestion: string }> = {
  unit_error: {
    message: '检测到潜在的单位错误',
    suggestion: '雨滴半径通常在0.05mm ~ 6mm之间。请确认是否混淆了毫米(mm)和微米(μm)单位？',
  },
  velocity_divergence: {
    message: '数值积分出现速度发散',
    suggestion: '计算结果不稳定，可能是参数超出合理范围或时间步长过大。请检查参数设置。',
  },
  model_not_applicable: {
    message: '阻力模型可能不适用',
    suggestion: '当雨滴半径 > 6mm时，雨滴会发生变形，球体阻力模型不再准确。建议使用较小的半径值。',
  },
  parameter_out_of_range: {
    message: '参数超出合理范围',
    suggestion: '请检查各参数是否在推荐范围内，异常参数可能导致计算结果不可靠。',
  },
};
