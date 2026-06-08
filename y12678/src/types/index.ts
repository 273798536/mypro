export type CoordinateSystem = "WGS84" | "CGCS2000" | "LOCAL";
export type RecordStatus = "normal" | "out-of-bounds" | "pending";
export type ConflictType = "duplicate" | "supplement-conflict" | "coordinate-mismatch";

export interface ViewSnapshot {
  id: string;
  name: string;
  thumbnailUrl: string;
  projectName: string;
  savedAt: string;
  operator: string;
  rowRange: string;
  hasSupplement: boolean;
  outOfBoundsCount: number;
  recordIds: string[];
}

export interface MeasurementRecord {
  id: string;
  originalRowNumber: number;
  cageId: string;
  imageName: string;
  sourceNote: string;
  coordinateSystem: CoordinateSystem;
  x: number;
  y: number;
  status: RecordStatus;
  createdAt: string;
  createdBy: string;
  isSupplemented: boolean;
}

export interface SupplementRecord {
  id: string;
  recordId: string;
  diffFields: Record<string, { old: any; new: any }>;
  operator: string;
  operatedAt: string;
  reason: string;
}

export interface CollisionResult {
  id: string;
  cageA: string;
  cageB: string;
  distance: number;
  screenshotUrl: string;
  basis: string;
  detectedAt: string;
  conclusion: string;
  relatedRecordIds: string[];
}

export interface DataConflict {
  id: string;
  recordIdA: string;
  recordIdB: string;
  similarity: number;
  diffFields: string[];
  conflictType: ConflictType;
  status: "pending" | "resolved";
}
