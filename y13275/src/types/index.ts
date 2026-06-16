export type PointStatus = 'pending' | 'merged' | 'abnormal';

export type DataSourceType = 'meeting_minutes' | 'attachment' | 'verbal_note';

export type AbnormalType = 'old_version' | 'late_arrival' | 'conflict';

export type ChangeField = 'remark' | 'status' | 'mergedFeedback';

export interface FirePoint {
  id: string;
  name: string;
  address: string;
  status: PointStatus;
  remark: string;
  originalFeedback: string;
  mergedFeedback: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataSource {
  id: string;
  pointId: string;
  type: DataSourceType;
  title: string;
  content: string;
  isAbnormal: boolean;
  abnormalType?: AbnormalType;
  affectsConclusion: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ChangeRecord {
  id: string;
  pointId: string;
  field: ChangeField;
  oldValue: string;
  newValue: string;
  operator: string;
  operatedAt: string;
  confirmed: boolean;
}

export type SyncStatus = 'idle' | 'saving' | 'synced' | 'error';

export interface UIState {
  selectedPointId: string | null;
  activeDataSourceTab: DataSourceType;
  expandedAbnormal: Set<string>;
  syncStatus: SyncStatus;
  lastSavedTime: string | null;
}
