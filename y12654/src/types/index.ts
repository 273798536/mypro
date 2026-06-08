export type AnomalyType = 'coordinate_mismatch' | 'timing_desync' | 'precision_overrun' | 'data_missing';

export type ProcessStatus = 'need_material' | 'need_calibration' | 'resolved';

export interface RunVersion {
  id: string;
  timestamp: string;
  label: '本次运行' | '上次运行';
}

export interface DataSource {
  upstreamId: string;
  collectedAt: string;
  device: string;
  operator: string;
  location: string;
}

export interface AnomalyDetail {
  id: string;
  recordId: string;
  type: AnomalyType;
  status: ProcessStatus;
  measuredValue: number;
  standardValue: number;
  deviation: number;
  threshold: number;
  description: string;
  position3d: { x: number; y: number; z: number };
  partName: string;
}

export interface ProcessingOpinion {
  systemSuggestion: string;
  manualNote: string;
  decision: ProcessStatus | null;
  riskRemarks: string;
}

export interface MeasurementRecord {
  id: string;
  timestamp: string;
  runId: string;
  anomalies: AnomalyDetail[];
  source: DataSource;
  opinion: ProcessingOpinion;
  createdAt: string;
}

export interface SavedViewpoint {
  id: string;
  name: string;
  recordId: string;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  createdAt: string;
}

export interface InterceptionRule {
  anomalyType: AnomalyType;
  ruleName: string;
  ruleDescription: string;
  criteria: string;
  consequence: string;
}

export const ANOMALY_TYPE_LABEL: Record<AnomalyType, string> = {
  coordinate_mismatch: '坐标系混用',
  timing_desync: '时间轴不同步',
  precision_overrun: '精度超限',
  data_missing: '数据缺失',
};

export const ANOMALY_TYPE_COLOR: Record<AnomalyType, string> = {
  coordinate_mismatch: 'danger',
  timing_desync: 'warning',
  precision_overrun: 'danger',
  data_missing: 'warning',
};

export const PROCESS_STATUS_LABEL: Record<ProcessStatus, string> = {
  need_material: '待补材料',
  need_calibration: '待改口径',
  resolved: '已处理',
};

export const PROCESS_STATUS_NEXT_ACTION: Record<AnomalyType, ProcessStatus> = {
  coordinate_mismatch: 'need_calibration',
  timing_desync: 'need_calibration',
  precision_overrun: 'need_material',
  data_missing: 'need_material',
};

export const ANOMALY_COLORS: Record<AnomalyType, { hex: string; name: string }> = {
  coordinate_mismatch: { hex: '#B84A3F', name: '砖红 - 严重坐标系错误' },
  timing_desync: { hex: '#D4A017', name: '琥珀 - 时间轴偏移警告' },
  precision_overrun: { hex: '#CD6A62', name: '浅红 - 精度超出阈值' },
  data_missing: { hex: '#E4B54A', name: '金黄 - 数据缺失警告' },
};
