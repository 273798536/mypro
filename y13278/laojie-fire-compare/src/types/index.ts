export type PlanStatus = 'draft' | 'pending' | 'suspended' | 'confirmed';

export type ChangeType =
  | 'create'
  | 'update_annotation'
  | 'add_feedback'
  | 'update_feedback'
  | 'add_photo'
  | 'update_description'
  | 'status_change'
  | 'confirm'
  | 'conflict_detected';

export type ConflictSeverity = 'warning' | 'critical';

export interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
}

export interface SceneAnnotation {
  id: string;
  planId: string;
  location: LocationPoint;
  category: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: number;
  updatedAt: number;
}

export interface ResidentFeedback {
  id: string;
  planId: string;
  round: number;
  author: string;
  content: string;
  relatedAnnotationId?: string;
  createdAt: number;
}

export interface SitePhoto {
  id: string;
  planId: string;
  annotationId?: string;
  dataUrl: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: number;
}

export interface ChangeRecord {
  id: string;
  planId: string;
  type: ChangeType;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  operator: string;
  description: string;
  timestamp: number;
  snapshotId?: string;
  confirmedBy?: string;
  confirmedAt?: number;
}

export interface VersionSnapshot {
  id: string;
  planId: string;
  version: number;
  data: {
    plan: FirePlan;
    annotations: SceneAnnotation[];
    feedbacks: ResidentFeedback[];
    photos: SitePhoto[];
  };
  createdAt: number;
  createdBy: string;
  message: string;
}

export interface ConflictInfo {
  id: string;
  planId: string;
  severity: ConflictSeverity;
  title: string;
  detail: string;
  affectedFields: string[];
  detectedAt: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  resolution?: 'accept_new' | 'keep_old' | 'merge_manual';
}

export interface FirePlan {
  id: string;
  name: string;
  location: LocationPoint;
  status: PlanStatus;
  sceneSummary: string;
  sideNote: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  version: number;
  conflicts: ConflictInfo[];
}

export interface UnifiedPlanView {
  plan: FirePlan;
  annotations: SceneAnnotation[];
  feedbacks: ResidentFeedback[];
  photos: SitePhoto[];
  changes: ChangeRecord[];
  snapshots: VersionSnapshot[];
}

export interface UpdateContext {
  operator: string;
  message: string;
}
