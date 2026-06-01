import { AnomalyType, AnomalyLevel, SystemConfig } from '../types';

export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  [AnomalyType.SENSOR_DRIFT]: '传感器漂移',
  [AnomalyType.EMISSIVITY_MISSING]: '发射率缺失',
  [AnomalyType.BATCH_MISMATCH]: '批次混入',
  [AnomalyType.FIELD_MISSING]: '缺字段',
};

export const ANOMALY_LEVEL_LABELS: Record<AnomalyLevel, string> = {
  [AnomalyLevel.CRITICAL]: '严重',
  [AnomalyLevel.WARNING]: '警告',
  [AnomalyLevel.INFO]: '提示',
};

export const ANOMALY_LEVEL_COLORS: Record<AnomalyLevel, string> = {
  [AnomalyLevel.CRITICAL]: '#F53F3F',
  [AnomalyLevel.WARNING]: '#FF7D00',
  [AnomalyLevel.INFO]: '#165DFF',
};

export const ANOMALY_TYPE_PRIORITY: Record<AnomalyType, number> = {
  [AnomalyType.SENSOR_DRIFT]: 4,
  [AnomalyType.FIELD_MISSING]: 3,
  [AnomalyType.EMISSIVITY_MISSING]: 2,
  [AnomalyType.BATCH_MISMATCH]: 1,
};

export const ANOMALY_TYPE_TO_LEVEL: Record<AnomalyType, AnomalyLevel> = {
  [AnomalyType.SENSOR_DRIFT]: AnomalyLevel.CRITICAL,
  [AnomalyType.EMISSIVITY_MISSING]: AnomalyLevel.WARNING,
  [AnomalyType.BATCH_MISMATCH]: AnomalyLevel.WARNING,
  [AnomalyType.FIELD_MISSING]: AnomalyLevel.WARNING,
};

export const DEFAULT_CONFIGS: Omit<SystemConfig, 'id' | 'isModified' | 'modifiedAt' | 'modifiedBy'>[] = [
  {
    configKey: 'drift_control_limit_sigma',
    configValue: 3,
    description: '漂移检测控制限倍数(σ)',
  },
  {
    configKey: 'drift_consecutive_points',
    configValue: 7,
    description: '连续异常点判定漂移阈值',
  },
  {
    configKey: 'drift_history_window',
    configValue: 30,
    description: '漂移检测历史数据窗口大小',
  },
  {
    configKey: 'temp_diff_significant_threshold',
    configValue: 5,
    description: '温度差异显著阈值(°C)',
  },
  {
    configKey: 'emissivity_min',
    configValue: 0.01,
    description: '发射率最小值',
  },
  {
    configKey: 'emissivity_max',
    configValue: 1.0,
    description: '发射率最大值',
  },
  {
    configKey: 'radiation_min',
    configValue: 100,
    description: '辐射强度最小值(W/m²)',
  },
  {
    configKey: 'radiation_max',
    configValue: 100000,
    description: '辐射强度最大值(W/m²)',
  },
  {
    configKey: 'temp_min',
    configValue: 0,
    description: '估算温度最小值(°C)',
  },
  {
    configKey: 'temp_max',
    configValue: 2000,
    description: '估算温度最大值(°C)',
  },
];

export const COLORS = {
  primary: '#165DFF',
  success: '#00B42A',
  warning: '#FF7D00',
  danger: '#F53F3F',
  info: '#86909C',
  normal: '#00B42A',
  isolated: '#86909C',
  background: '#0F172A',
  surface: '#1E293B',
  border: '#334155',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
} as const;

export const CHART_THEME = {
  backgroundColor: 'transparent',
  textStyle: {
    color: COLORS.text,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  title: {
    textStyle: {
      color: COLORS.text,
    },
  },
  legend: {
    textStyle: {
      color: COLORS.textSecondary,
    },
  },
  axisLine: {
    lineStyle: {
      color: COLORS.border,
    },
  },
  splitLine: {
    lineStyle: {
      color: COLORS.border,
      opacity: 0.3,
    },
  },
};
