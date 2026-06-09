export interface LatticeParameters {
  a: number;
  b: number;
  c: number;
  alpha: number;
  beta: number;
  gamma: number;
  layersX: number;
  layersY: number;
  layersZ: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CollisionItem {
  collisionId: string;
  position: Vec3;
  volume: number;
  deviceIds: string[];
  atomPair: [string, string];
  explanation: string;
  approved?: boolean;
  approver?: string;
  approvedAt?: number;
  approveReason?: string;
}

export interface AuditLog {
  logId: string;
  timestamp: number;
  operator: string;
  action:
    | "parameter_change"
    | "collision_approved"
    | "collision_rejected"
    | "review_submit"
    | "note_update"
    | "batch_created";
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}

export interface PointCloudSlice {
  axis: "X" | "Y" | "Z";
  position: number;
  points: Vec3[];
  description: string;
}

export interface CrossSection {
  axis: "X" | "Y" | "Z";
  position: number;
  atoms: { element: string; position: Vec3; radius: number }[];
  description: string;
}

export interface ModelOverlap {
  overlapRegions: { position: Vec3; volume: number; atoms: string[] }[];
  totalOverlapVolume: number;
  description: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface BatchRecord {
  batchId: string;
  runTimestamp: number;
  materialName: string;
  parameters: LatticeParameters;
  collisions: CollisionItem[];
  pointCloudSlice: PointCloudSlice;
  crossSection: CrossSection;
  modelOverlap: ModelOverlap;
  auditLogs: AuditLog[];
  reviewStatus: ReviewStatus;
  reviewerNote?: string;
  cameraLost?: boolean;
}

export interface CameraState {
  position: Vec3;
  target: Vec3;
  isInvalid: boolean;
}
