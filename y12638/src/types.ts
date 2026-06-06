export type Status = '通过' | '待确认' | '失败';

export interface Device {
  id: string;
  name: string;
  type: string;
  location: string;
  status: Status;
}

export interface CoordRecord {
  id: string;
  batchId: string;
  deviceId: string;
  x: number;
  y: number;
  timestamp: number;
  source: '底图坐标' | '轨迹记录';
}

export interface ConflictRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  coordId1: string;
  coordId2: string;
  reason: string;
  status: Status;
  notes?: string;
  batchId: string;
}

export interface Batch {
  id: string;
  name: string;
  timestamp: number;
  status: Status;
  deviceCount: number;
  conflictCount: number;
}

export interface ValidationError {
  field: string;
  message: string;
  suggestion: string;
}
