export type RecordStatus = 'pending' | 'passed' | 'review' | 'failed';
export type Severity = 'low' | 'medium' | 'high';

export interface NormalVector {
  id: string;
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  deviation: number;
  isValid: boolean;
  explanation: string;
}

export interface Screenshot {
  id: string;
  order: number;
  url: string;
  timestamp: string;
  annotation: string | null;
  hasIssue?: boolean;
}

export interface PointCloudSlice {
  id: string;
  sliceIndex: number;
  data: number[];
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  action: string;
  userId: string;
  userName?: string;
  timestamp: string;
  details: string | null;
  version?: string;
}

export interface OcclusionInfo {
  detected: boolean;
  reason: string | null;
  severity: Severity | null;
  affectedArea: { x: number; y: number; width: number; height: number } | null;
  deviceCoordinateRelation: string | null;
}

export interface NormalRecord {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceCoordinates: { x: number; y: number; z: number };
  operator: string;
  status: RecordStatus;
  pointCount: number;
  normalDeviation: number;
  normalVectors: NormalVector[];
  occlusion: OcclusionInfo;
  screenshots: Screenshot[];
  slices: PointCloudSlice[];
  history: HistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  status: RecordStatus | 'all';
  deviceId: string;
  severity: Severity | '';
  keyword: string;
  dateRange: [string, string] | null;
}
