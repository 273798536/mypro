export type PointStatus = 'pending' | 'inspected' | 'failed';

export interface DrainPoint {
  id: string;
  x: number;
  y: number;
  status: PointStatus;
  notes: string;
  createdAt: number;
  address?: string;
  hitDetection?: 'hit' | 'miss' | 'pending';
}

export interface InspectionStatus {
  status: 'draft' | 'completed';
  boundaryFailTriggered: boolean;
  undoPerformed: boolean;
}

export interface Inspection {
  id: string;
  title: string;
  status: 'draft' | 'completed';
  drainPoints: DrainPoint[];
  createdAt: number;
  updatedAt: number;
  boundaryFailTriggered: boolean;
  undoPerformed: boolean;
  boundaryNotes?: string;
}

export interface Draft {
  id: string;
  inspectionId: string;
  data: Partial<Inspection>;
  timestamp: number;
}

export interface HistoryState {
  past: Draft[];
  present: Inspection;
  future: Draft[];
}

export interface PointMutationLog {
  pointId: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  oldStatus?: PointStatus;
  newStatus?: PointStatus;
  timestamp: number;
}

export interface ExportReport {
  title: string;
  exportedAt: string;
  inspectionStatus: string;
  totalPoints: number;
  inspectedCount: number;
  pendingCount: number;
  failedCount: number;
  hitCount: number;
  missCount: number;
  boundaryFailTriggered: boolean;
  undoPerformed: boolean;
  points: Array<{
    id: string;
    address: string;
    status: string;
    hitDetection: string;
    notes: string;
  }>;
}
