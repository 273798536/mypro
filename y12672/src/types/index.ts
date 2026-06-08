export interface ContainerPosition {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  importBatch: string;
  createdAt: Date;
}

export type AnomalyType = 'model_overlap' | 'camera_lost' | 'size_exceed' | 'position_offset';
export type Severity = 'high' | 'medium' | 'low';
export type AnomalyStatus = 'pending' | 'processing' | 'processed' | 'reviewed';

export interface AnomalyRecord {
  id: string;
  type: AnomalyType;
  severity: Severity;
  status: AnomalyStatus;
  sourceInfo: {
    importBatch: string;
    importTime: Date;
    sourceFile: string;
  };
  riskNote: string;
  processingSuggestion: string;
  relatedContainerIds: string[];
  cameraState?: CameraState;
  createdAt: Date;
  updatedAt: Date;
}

export type OperatorRole = 'simulation_engineer' | 'operations_team';
export type ProcessingAction = 'add_risk_note' | 'add_suggestion' | 'change_status' | 'review' | 'export';

export interface ProcessingRecord {
  id: string;
  anomalyId: string;
  operator: string;
  operatorRole: OperatorRole;
  action: ProcessingAction;
  beforeValue?: string;
  afterValue: string;
  timestamp: Date;
  exportSnapshot?: ExportSnapshot;
}

export interface HistoryLog {
  id: string;
  targetType: 'anomaly' | 'container';
  targetId: string;
  operator: string;
  operatorRole: string;
  action: string;
  beforeState: object;
  afterState: object;
  reason: string;
  timestamp: Date;
}

export interface CameraState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  zoom: number;
  isLost: boolean;
  lostReason?: string;
  savedAt?: Date;
}

export interface ExportSnapshot {
  type: 'screenshot' | 'report';
  format: 'png' | 'pdf' | 'excel';
  anomalyIds: string[];
  processingRecords: ProcessingRecord[];
  exportedBy: string;
  exportedAt: Date;
}

export interface FilterState {
  anomalyType: AnomalyType[];
  severity: Severity[];
  status: AnomalyStatus[];
  dateRange: { start: Date; end: Date } | null;
  importBatch: string[];
}

export interface AppState {
  containers: ContainerPosition[];
  anomalies: AnomalyRecord[];
  processingRecords: ProcessingRecord[];
  historyLogs: HistoryLog[];
  currentView: '3d' | 'list';
  selectedAnomaly: AnomalyRecord | null;
  filters: FilterState;
  cameraStates: CameraState[];
  isFirstVisit: boolean;
}

export type AppAction =
  | { type: 'IMPORT_DATA'; payload: ContainerPosition[] }
  | { type: 'DETECT_ANOMALIES'; payload: AnomalyRecord[] }
  | { type: 'ADD_PROCESSING_RECORD'; payload: ProcessingRecord }
  | { type: 'UPDATE_ANOMALY_STATUS'; payload: { id: string; status: AnomalyStatus } }
  | { type: 'ADD_HISTORY_LOG'; payload: HistoryLog }
  | { type: 'SAVE_CAMERA_STATE'; payload: CameraState }
  | { type: 'EXPORT_DATA'; payload: ExportSnapshot }
  | { type: 'SET_CURRENT_VIEW'; payload: '3d' | 'list' }
  | { type: 'SET_SELECTED_ANOMALY'; payload: AnomalyRecord | null }
  | { type: 'UPDATE_FILTERS'; payload: Partial<FilterState> }
  | { type: 'LOAD_INITIAL_DATA'; payload: Partial<AppState> }
  | { type: 'SET_FIRST_VISIT'; payload: boolean };
