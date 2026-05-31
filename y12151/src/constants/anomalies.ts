import { AnomalyType } from '../types';

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  temperature_uncorrected: '温度未校正',
  multiple_echo: '多重回声',
  unit_confusion: '单位混乱',
  outlier: '离群值',
  material_missing: '材质缺失',
  temperature_extreme: '温度异常',
};

export const ANOMALY_DESCRIPTIONS: Record<AnomalyType, string> = {
  temperature_uncorrected: '该记录未进行温度校正，声速计算可能存在偏差',
  multiple_echo: '检测到多重回波信号，可能存在反射干扰',
  unit_confusion: '单位格式不统一，已自动转换为标准单位',
  outlier: '数值超出正常范围，可能为测量错误',
  material_missing: '反射面材质信息缺失，无法进行材质校正',
  temperature_extreme: '环境温度超出正常工作范围',
};

export const ANOMALY_SUGGESTIONS: Record<AnomalyType, string> = {
  temperature_uncorrected: '建议执行温度校正算法，或手动确认环境温度',
  multiple_echo: '建议检查测量环境，移除可能造成多次反射的障碍物',
  unit_confusion: '已自动转换，建议确认原始数据的单位标注是否正确',
  outlier: '建议复核该次测量，或从数据集中剔除',
  material_missing: '请在第二阶段导入反射面材质信息',
  temperature_extreme: '建议在标准室温环境下重新测量',
};

export const ANOMALY_SEVERITY: Record<AnomalyType, 'warning' | 'error'> = {
  temperature_uncorrected: 'warning',
  multiple_echo: 'error',
  unit_confusion: 'warning',
  outlier: 'error',
  material_missing: 'warning',
  temperature_extreme: 'error',
};

export const ANOMALY_COLORS: Record<AnomalyType, string> = {
  temperature_uncorrected: '#f59e0b',
  multiple_echo: '#ef4444',
  unit_confusion: '#8b5cf6',
  outlier: '#ef4444',
  material_missing: '#f59e0b',
  temperature_extreme: '#ef4444',
};

export const ANOMALY_ICONS: Record<AnomalyType, string> = {
  temperature_uncorrected: 'thermometer',
  multiple_echo: 'waves',
  unit_confusion: 'ruler',
  outlier: 'alert-triangle',
  material_missing: 'box',
  temperature_extreme: 'flame',
};
