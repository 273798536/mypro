export type RecordStatus = 'available' | 'unavailable' | 'pending' | 'passed' | 'failed' | 'review';

export interface NormalRecord {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceCoordinates: { x: number; y: number; z: number };
  operator: string;
  status: RecordStatus;
  pointCount: number;
  normalDeviation: number;
  normalData: NormalVector[];
  occlusionReason: string | null;
  occlusion: {
    detected: boolean;
    reason: string | null;
    severity: 'low' | 'medium' | 'high' | null;
    affectedArea: { x: number; y: number; width: number; height: number } | null;
    deviceCoordinateRelation: string | null;
  };
  screenshots: Screenshot[];
  pointCloudSlices: PointCloudSlice[];
  history: HistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface NormalVector {
  id: string;
  recordId: string;
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  deviation: number;
  isValid: boolean;
  explanation: string;
}

export interface Screenshot {
  id: string;
  recordId: string;
  order: number;
  url: string;
  timestamp: string;
  annotation: string | null;
  hasIssue?: boolean;
}

export interface PointCloudSlice {
  id: string;
  recordId: string;
  sliceIndex: number;
  data: number[];
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  recordId: string;
  action: string;
  userId: string;
  userName?: string;
  version?: string;
  timestamp: string;
  details: string | null;
  snapshot: NormalRecord;
}

export interface CreateSlicePayload {
  sliceIndex: number;
  data: number[];
}

export interface UpdateRecordPayload {
  timestamp?: string;
  deviceId?: string;
  deviceCoordinates?: { x: number; y: number; z: number };
  status?: RecordStatus;
  occlusionReason?: string | null;
}
