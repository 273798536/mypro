export interface DataRecord {
  id: string;
  timestamp: number;
  x: number;
  y: number;
  floor: number;
  peopleCount: number;
  isAnomaly: boolean;
  anomalyType?: 'out_of_bounds' | 'sudden_spike' | 'zero_flow' | 'other';
}

export type AnomalyStatus = 'pending' | 'confirmed' | 'dismissed';
export type AnomalyAction = 'created' | 'confirmed' | 'dismissed' | 'updated';

export interface Anomaly {
  id: string;
  recordId: string;
  status: AnomalyStatus;
  reviewer: string;
  comment: string;
  reviewedAt: number;
}

export interface HistoryEntry {
  id: string;
  anomalyId: string;
  action: AnomalyAction;
  user: string;
  reason: string;
  timestamp: number;
}

export interface ProfileSnapshot {
  id: string;
  timestamp: number;
  data: DataRecord[];
  version: number;
  label: string;
}

export type GameStatus = 'idle' | 'running' | 'paused' | 'finished' | 'reviewing';

export interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface CollisionEvent {
  recordId: string;
  timestamp: number;
  type: 'boundary_violation' | 'anomaly_contact';
  details: string;
}

export interface GameSession {
  id: string;
  startTime: number;
  endTime?: number;
  status: GameStatus;
  processedRecords: string[];
  collisionEvents: CollisionEvent[];
  viewSnapshots: ViewState[];
  score: number;
}

export interface ExportReport {
  generatedAt: number;
  sessionId: string;
  totalRecords: number;
  anomaliesFound: number;
  anomaliesConfirmed: number;
  anomaliesDismissed: number;
  history: HistoryEntry[];
  profileBefore: ProfileSnapshot | null;
  profileAfter: ProfileSnapshot | null;
}
