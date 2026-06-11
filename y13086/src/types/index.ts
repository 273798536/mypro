export interface LightParams {
  brightness: number;
  colorTemp: number;
  schedule: string;
  flickerRate?: number;
  actualOnTime?: string;
  actualOffTime?: string;
}

export interface MuseumRecord {
  id: string;
  cabinetNo: string;
  floor: string;
  unit: string;
  lightParams: LightParams | string;
  anomalyType: 'normal' | 'flicker' | 'off_schedule' | 'brightness_abnormal' | 'mixed_unit';
  anomalyLevel: 'none' | 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'rejudged' | 'resolved';
  judgment: string;
  originalJudgment: string;
  hasDirtyData: boolean | number;
  dirtyDataNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  recordId: string;
  originalFilename: string;
  storedFilename: string;
  captureTime: string;
  deviceInfo: string;
  exifData: Record<string, string> | string;
  uploadedAt: string;
}

export interface Annotation {
  id: string;
  recordId: string;
  photoId: string;
  type: 'arrow' | 'circle' | 'rect' | 'text' | 'highlight';
  position: { x: number; y: number; width?: number; height?: number; radius?: number } | string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  recordId: string;
  action: 'create' | 'judge' | 'rejudge' | 'annotate' | 'status_change';
  oldValue: string;
  newValue: string;
  reason: string;
  operatorName: string;
  operatorRole: string;
  timestamp: string;
}

export interface RecordDetail {
  record: MuseumRecord;
  photos: Photo[];
  annotations: Annotation[];
  history: HistoryEntry[];
}

export interface ReportConfig {
  dateFrom: string;
  dateTo: string;
  floor?: string;
  anomalyType?: string;
  includePhotos: boolean;
  includeHistory: boolean;
}

export type ViewMode = 'anomaly_first' | 'chronological' | 'by_cabinet';
export type UserRole = 'inspector' | 'teacher' | 'handover';
