export interface SensorRecord {
  id: string;
  sensorName: string;
  channel: string;
  cabinet: string;
  type: 'temperature' | 'humidity' | 'pressure';
  value: number;
  timestamp: string;
  unit: string;
}

export interface FilterCriteria {
  id: string;
  timeRangeStart: string;
  timeRangeEnd: string;
  channel?: string;
  cabinet?: string;
  sensorType?: string;
  anomalyType?: string;
}

export type AnomalyType = 'adjacent_merge_error' | 'value_out_of_range' | 'sensor_offline' | 'data_gap';
export type AnomalyStatus = 'pending' | 'processing' | 'resolved';

export interface AnomalyRecord {
  id: string;
  sensorId: string;
  sensorName: string;
  filterId: string;
  type: AnomalyType;
  description: string;
  status: AnomalyStatus;
  result: string;
  screenshotUrl?: string;
  sourceObjectId?: string;
  filterSnapshot?: FilterCriteria;
  createdAt: string;
  materials: AttachedMaterial[];
}

export interface AttachedMaterial {
  id: string;
  name: string;
  type: 'screenshot' | 'note' | 'file';
  url?: string;
  content?: string;
  uploadedAt: string;
}

export interface HistoricalNote {
  id: string;
  sensorId: string;
  sensorName: string;
  content: string;
  author: string;
  timestamp: string;
  screenshotUrl?: string;
  isLatest: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  speed: number;
  currentTime: string;
}

export interface ExportRecord {
  id: string;
  format: 'csv' | 'json';
  recordCount: number;
  filterCriteria: FilterCriteria;
  exportedAt: string;
  fileName: string;
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  adjacent_merge_error: '异常-相邻点位合错',
  value_out_of_range: '异常-数值超限',
  sensor_offline: '异常-传感器离线',
  data_gap: '异常-数据断档',
};

export const ANOMALY_STATUS_LABELS: Record<AnomalyStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已处理',
};

export const CHANNELS = ['冷通道A', '冷通道B', '冷通道C', '冷通道D'];
export const CABINETS = ['A01', 'A02', 'A03', 'A04', 'A05', 'B01', 'B02', 'B03', 'B04', 'B05'];
export const SENSOR_TYPES: Array<{ value: SensorRecord['type']; label: string }> = [
  { value: 'temperature', label: '温度' },
  { value: 'humidity', label: '湿度' },
  { value: 'pressure', label: '气压' },
];
