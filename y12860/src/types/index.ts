export type BuoyStatus = 'normal' | 'offline' | 'anomaly' | 'out_of_range' | 'pending';

export type SensorType = 'temperature' | 'salinity' | 'pressure' | 'wave' | 'wind';

export interface Sensor {
  id: string;
  type: SensorType;
  value: number;
  threshold: { min: number; max: number };
  isOutOfRange: boolean;
  unit: string;
}

export interface Buoy {
  id: string;
  name: string;
  code: string;
  location: { lat: number; lng: number };
  depth: number;
  status: BuoyStatus;
  lastOnline: string;
  offlineDuration: number;
  sensors: Sensor[];
  operator: string;
  installDate: string;
}

export type OperationType =
  | 'offline_detected'
  | 'forecast_updated'
  | 'photo_modified'
  | 'status_checked'
  | 'note_added'
  | 'data_supplemented'
  | 'caliber_adjusted';

export type SourceMaterialType = 'forecast_file' | 'inspection_photo' | 'ship_track' | 'manual_note';

export interface SourceMaterial {
  id: string;
  type: SourceMaterialType;
  name: string;
  uploadedAt: string;
  uploader: string;
  exifInfo?: Record<string, string>;
  size?: string;
}

export interface DataVersion {
  id: string;
  timestamp: string;
  fields: Record<string, any>;
}

export interface EventRecord {
  id: string;
  buoyId: string;
  timestamp: string;
  operator: string;
  operationType: OperationType;
  content: string;
  sourceMaterial?: SourceMaterial;
  versionBefore?: DataVersion;
  versionAfter?: DataVersion;
}

export interface DiffItem {
  field: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'modified' | 'deleted';
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyType = 'late_forecast' | 'sensor_drift' | 'data_gap' | 'track_anomaly' | 'out_of_range';
export type NextAction = 'supplement_material' | 'adjust_caliber' | 'recollect';

export interface RiskAssessment {
  id: string;
  buoyId: string;
  anomalyType: AnomalyType;
  impactLevel: 1 | 2 | 3 | 4 | 5;
  likelihoodLevel: 1 | 2 | 3 | 4 | 5;
  riskLevel: RiskLevel;
  nextAction: NextAction;
  shortDescription: string;
  availableData: string[];
  pendingData: string[];
  recollectData: string[];
  createdAt: string;
}

export interface TidePoint {
  time: string;
  hourLabel: string;
  height: number;
  isForecast: boolean;
  isLate: boolean;
  isOutOfRange: boolean;
}

export interface TideReport {
  id: string;
  buoyId: string;
  portName: string;
  startDate: string;
  endDate: string;
  tideData: TidePoint[];
  highTides: TidePoint[];
  lowTides: TidePoint[];
  datumHeight: number;
  forecastQuality: {
    onTimeRate: number;
    outOfRangeCount: number;
    totalPoints: number;
  };
  generatedAt: string;
}

export type QualityFlag = 'null_value' | 'duplicate' | 'mixed_remark';
export type Availability = 'available' | 'need_clean' | 'unavailable';

export interface TrackPoint {
  id: string;
  index: number;
  timestamp: string;
  lat: number | null;
  lng: number | null;
  speed: number | null;
  heading: number | null;
  remark: string;
  qualityFlags: QualityFlag[];
  availability: Availability;
  duplicateOf?: number;
}

export type DeliveryStatus = 'direct_use' | 'need_review';

export interface DeliveryCard {
  id: string;
  buoyId: string;
  buoyName: string;
  buoyCode: string;
  dataPeriod: { start: string; end: string };
  status: DeliveryStatus;
  shortDescription: string;
  availableItems: string[];
  pendingItems: string[];
  recollectItems: string[];
  reviewer?: string;
  reviewNote?: string;
  deliveredAt: string;
  reportId?: string;
}

export interface SavedView {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  filter: {
    statuses: BuoyStatus[];
    buoyIds: string[];
    dateRange?: { start: string; end: string };
  };
  zoomLevel: number;
  focusBuoyId?: string;
}

export const BUOY_STATUS_LABEL: Record<BuoyStatus, string> = {
  normal: '运行正常',
  offline: '离线',
  anomaly: '数据异常',
  out_of_range: '越界预警',
  pending: '待复核',
};

export const SENSOR_TYPE_LABEL: Record<SensorType, string> = {
  temperature: '水温',
  salinity: '盐度',
  pressure: '水压',
  wave: '浪高',
  wind: '风速',
};

export const OPERATION_TYPE_LABEL: Record<OperationType, string> = {
  offline_detected: '检测到离线',
  forecast_updated: '气象预报补录',
  photo_modified: '巡检照片修订',
  status_checked: '状态核查',
  note_added: '添加备注',
  data_supplemented: '补充数据',
  caliber_adjusted: '调整口径',
};

export const ANOMALY_TYPE_LABEL: Record<AnomalyType, string> = {
  late_forecast: '风浪预报晚到',
  sensor_drift: '传感器漂移',
  data_gap: '数据断档',
  track_anomaly: '轨迹异常',
  out_of_range: '数值越界',
};

export const NEXT_ACTION_LABEL: Record<NextAction, string> = {
  supplement_material: '补材料',
  adjust_caliber: '改口径',
  recollect: '重新采集',
};

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '紧急风险',
};

export const SOURCE_MATERIAL_LABEL: Record<SourceMaterialType, string> = {
  forecast_file: '气象预报文件',
  inspection_photo: '巡检照片',
  ship_track: '船舶轨迹',
  manual_note: '人工记录',
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: '直接可用',
  need_clean: '需清洗',
  unavailable: '不可用',
};
