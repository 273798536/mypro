import { DataQualityIssue, DiagnosisType, SeverityLevel } from '@/types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

export const formatDateTime = (date: Date): string => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const getAnomalyTypeLabel = (type: DataQualityIssue): string => {
  const labels: Record<DataQualityIssue, string> = {
    missing_sample: '缺采样',
    clock_drift: '时钟漂移',
    sensor_offline: '传感器离线',
    outlier: '异常跳点',
    value_out_of_range: '超出量程',
  };
  return labels[type];
};

export const getDiagnosisTypeLabel = (type: DiagnosisType): string => {
  const labels: Record<DiagnosisType, string> = {
    sensor_fault: '传感器故障',
    cargo_anomaly: '货物异常',
    data_quality_issue: '数据质量问题',
    environment_change: '环境变化',
    unknown: '待确认',
  };
  return labels[type];
};

export const getSeverityLabel = (severity: SeverityLevel): string => {
  const labels: Record<SeverityLevel, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  };
  return labels[severity];
};

export const getSeverityColor = (severity: SeverityLevel): string => {
  const colors: Record<SeverityLevel, string> = {
    low: 'text-yellow-400 bg-yellow-400/10',
    medium: 'text-orange-400 bg-orange-400/10',
    high: 'text-red-400 bg-red-400/10',
    critical: 'text-red-500 bg-red-500/20',
  };
  return colors[severity];
};

export const getAnomalyTypeColor = (type: DataQualityIssue): string => {
  const colors: Record<DataQualityIssue, string> = {
    missing_sample: '#6366F1',
    clock_drift: '#8B5CF6',
    sensor_offline: '#F97316',
    outlier: '#EF4444',
    value_out_of_range: '#F59E0B',
  };
  return colors[type];
};

export const getDiagnosisTypeColor = (type: DiagnosisType): string => {
  const colors: Record<DiagnosisType, string> = {
    sensor_fault: '#EF4444',
    cargo_anomaly: '#F97316',
    data_quality_issue: '#F59E0B',
    environment_change: '#38BDF8',
    unknown: '#6B7280',
  };
  return colors[type];
};

export const calculateMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

export const calculateStdDev = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
};

export const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

export const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

export const getTimeDiffMinutes = (date1: Date, date2: Date): number => {
  return Math.abs(new Date(date1).getTime() - new Date(date2).getTime()) / (1000 * 60);
};

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const parseCSV = (text: string): string[][] => {
  const lines = text.split('\n');
  return lines
    .filter((line) => line.trim())
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
};

export const toFixed = (num: number, decimals: number = 2): string => {
  return Number(num).toFixed(decimals);
};
