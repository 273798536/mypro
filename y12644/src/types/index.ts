export type RecordStatus = 'success' | 'pending' | 'error';

export type RecordType = 'guide' | 'warning' | 'info';

export interface Annotation {
  id: string;
  recordId: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface Device {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive';
}

export interface StationRecord {
  id: string;
  type: RecordType;
  xCoordinate: number;
  yCoordinate: number;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
  isFlipped: boolean;
  flipExplanation?: string;
  deviceId?: string;
  annotation?: Annotation;
  label: string;
  score?: number;
}

export type ActionType = 'move' | 'annotate' | 'status_change' | 'device_update' | 'add' | 'delete';

export interface HistoryEntry {
  id: string;
  actionType: ActionType;
  actionData: any;
  previousState: any;
  timestamp: string;
  description: string;
}

export interface CanvasState {
  records: StationRecord[];
  devices: Device[];
  selectedRecordId: string | null;
  zoom: number;
  offset: { x: number; y: number };
}

export interface FilterOptions {
  status?: RecordStatus;
  type?: RecordType;
  isFlipped?: boolean;
  searchText?: string;
}

export interface ScoreTableItem {
  recordId: string;
  label: string;
  score: number;
  status: RecordStatus;
  maxScore: number;
}

export interface ExportReport {
  exportTime: string;
  operator: string;
  totalRecords: number;
  statusCounts: {
    success: number;
    pending: number;
    error: number;
  };
  flippedRecords: Array<{
    record: StationRecord;
    explanation: string;
  }>;
  annotations: Array<{
    record: StationRecord;
    originalNote: string;
  }>;
  scoringSummary: {
    colorRules: ColorRule[];
    scoreTable: ScoreTableItem[];
    syncStatusCheck: SyncStatusCheck;
  };
  samples: {
    success: StationRecord[];
    pending: StationRecord[];
    error: StationRecord[];
  };
}

export interface ColorRule {
  status: RecordStatus | 'flipped';
  color: string;
  label: string;
  description: string;
}

export interface SyncStatusCheck {
  lastSyncTime: string;
  undoOperationsCount: number;
  stateConsistent: boolean;
  details: string;
}

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const FLIP_THRESHOLD = 100;
