export type ObjectType = "STATION" | "TOWER" | "CAR" | "CABLE";
export type ObjectStatus = "NORMAL" | "WARNING" | "ERROR";

export interface CablewayObject {
  id: string;
  name: string;
  type: ObjectType;
  floor: string;
  unit: string;
  position: [number, number, number];
}

export interface TimestampState {
  id: string;
  objectId: string;
  timestamp: number;
  status: ObjectStatus;
  detail: string;
}

export type Severity = "CRITICAL" | "MAJOR" | "MINOR";
export type ResolveStatus = "PENDING" | "CONFIRMED" | "RESOLVED";

export interface Anomaly {
  id: string;
  objectId: string;
  timestamp: number;
  severity: Severity;
  description: string;
  resolved: ResolveStatus;
  resolver?: string;
}

export type AnnotationStatus = "ACTIVE" | "REVOKED";

export interface Annotation {
  id: string;
  objectId: string;
  timestamp: number;
  content: string;
  author: string;
  status: AnnotationStatus;
  mixedWarning: boolean;
  createdAt: number;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface FilterState {
  floors: string[];
  units: string[];
  types: ObjectType[];
  statuses: ObjectStatus[];
}

export interface ViewSnapshot {
  id: string;
  name: string;
  timestamp: number;
  camera: CameraState;
  filters: FilterState;
  selectedObjectId?: string;
  thumbnail?: string;
  createdAt: number;
}

export type HistoryAction = "ANNOTATE" | "REVOKE" | "CONFIRM" | "SAVE_VIEW";

export interface HistoryLog {
  id: string;
  action: HistoryAction;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  operator: string;
  createdAt: number;
}

export type MaterialStatus = "PASS" | "NEED_FIX";

export interface MaterialItem {
  id: string;
  title: string;
  status: MaterialStatus;
  reason: string;
  owner: string;
}

export interface KeyframeMarker {
  timestamp: number;
  type: "ANOMALY" | "ANNOTATION";
  refId: string;
}
