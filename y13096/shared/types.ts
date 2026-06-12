export type MaterialType = 'point' | 'attachment' | 'oral';
export type ProcessStatus = 'untreated' | 'processed' | 'need_evidence' | 'rejected';
export type AnomalyTag = 'normal' | 'gap' | 'late' | 'modified';

export interface Position {
  lng: number;
  lat: number;
  altitude?: number;
}

export interface AttachmentMeta {
  fileName: string;
  fileSize: number;
  uploadTime: string;
  isLate: boolean;
  expectedTime: string;
}

export interface OralMeta {
  speaker: string;
  audioUrl?: string;
  transcript: string;
}

export interface CaliberChange {
  changedAt: string;
  changedBy: string;
  field: string;
  beforeValue: string;
  afterValue: string;
  reason: string;
}

export interface MaterialItem {
  id: string;
  type: MaterialType;
  name: string;
  timestamp: string;
  position?: Position;
  attachmentMeta?: AttachmentMeta;
  oralMeta?: OralMeta;
  caliberHistory: CaliberChange[];
  hasModifiedCaliber: boolean;
  fillsGapId?: string;
  processStatus: ProcessStatus;
  processNote?: string;
}

export interface TimelineGap {
  id: string;
  start: string;
  end: string;
  durationMinutes: number;
  severity: 'warning' | 'critical';
  relatedMaterialIds: string[];
  note: string;
}

export interface FilterSnapshot {
  dateRange: { start: string; end: string };
  anomalyStatus: AnomalyTag[];
  materialTypes: MaterialType[];
  hasModifiedCaliber: boolean | null;
  processStatuses: ProcessStatus[];
  rawSqlLike: string;
}

export interface AnomalySummary {
  totalMaterials: number;
  lateAttachments: number;
  modifiedCalibers: number;
  timelineGaps: number;
  byStatus: Record<ProcessStatus, number>;
}

export interface MaterialQueryResponse {
  code: number;
  message: string;
  data: {
    items: MaterialItem[];
    filterSnapshot: FilterSnapshot;
    anomalySummary: AnomalySummary;
    timelineGaps: TimelineGap[];
  };
  timestamp: string;
  requestId: string;
}

export interface CameraState {
  mode: '2D' | '3D';
  center: { lng: number; lat: number };
  zoom?: number;
  position?: [number, number, number];
  target?: [number, number, number];
}

export interface ViewState {
  camera: CameraState;
  filter: FilterSnapshot;
  currentTime: string;
  ui: {
    selectedMaterialId?: string;
    sidebarTab: 'points' | 'attachments' | 'orals' | 'anomalies';
  };
  createdAt: string;
}

export interface SavedView {
  id: string;
  name: string;
  viewState: ViewState;
}
