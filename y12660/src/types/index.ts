export type AvailabilityStatus = 'usable' | 'review_needed' | 'unusable';
export type AnomalyType = 'empty_coordinate' | 'duplicate_record' | 'remark_mixed' | 'camera_view_lost';
export type AnomalySeverity = 'warning' | 'error';

export interface ImportBatch {
  id: string;
  name: string;
  importedAt: string;
  importedBy: string;
  recordCount: number;
}

export interface DeviceCoordinates {
  x: number | null;
  y: number | null;
  z: number | null;
}

export interface Anomaly {
  id: string;
  recordId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  fieldName?: string;
}

export interface ProcessNote {
  id: string;
  recordId: string;
  author: string;
  content: string;
  createdAt: string;
  statusAfter: AvailabilityStatus;
}

export interface CameraView {
  id: string;
  recordId: string;
  isValid: boolean;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  label?: string;
}

export interface SoundRay {
  id: string;
  recordId: string;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  blockedBy?: string;
  energyLoss: number;
}

export interface ParamChange {
  id: string;
  recordId: string;
  sourceField: string;
  oldValue: string;
  newValue: string;
  reason: string;
  changedAt: string;
}

export interface SoundRecord {
  id: string;
  batchId: string;
  deviceCode: string;
  deviceCoordinates: DeviceCoordinates;
  rawRemark: string;
  availabilityStatus: AvailabilityStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  anomalies: Anomaly[];
  processNotes: ProcessNote[];
  cameraView?: CameraView;
  soundRays: SoundRay[];
  paramChanges: ParamChange[];
}

export interface ImportRawRecord {
  deviceCode: string;
  deviceCoordinates: DeviceCoordinates;
  rawRemark: string;
  cameraView?: Omit<CameraView, 'id' | 'recordId'>;
  soundRays?: Omit<SoundRay, 'id' | 'recordId'>[];
}

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  empty_coordinate: '空坐标',
  duplicate_record: '重复记录',
  remark_mixed: '备注混写',
  camera_view_lost: '相机视角丢失',
};

export const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  usable: '可直接用',
  review_needed: '需复核',
  unusable: '不可用',
};
