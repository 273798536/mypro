export type PointStatus = 'normal' | 'abnormal' | 'pending' | 'merged';
export type MaterialSource = 'resident_feedback' | 'written' | 'verbal';
export type MergeStatus = 'auto_merged' | 'evidence_merged' | 'pending_review' | 'split';
export type AnomalyType = 'caliber_changed' | 'adjacent_conflict' | 'name_inconsistency' | 'orphan_point';
export type AnomalySeverity = 'high' | 'medium' | 'low';

export interface Point {
  id: string;
  name: string;
  location: string;
  status: PointStatus;
  aliases: string[];
  materialIds: string[];
  mergeId?: string;
  createdAt: string;
}

export interface MaterialVersion {
  id: string;
  version: number;
  content: string;
  timestamp: string;
  changer: string;
  changeNote: string;
  pointMentions: string[];
}

export interface Material {
  id: string;
  title: string;
  source: MaterialSource;
  uploader: string;
  uploadTime: string;
  currentVersion: number;
  versions: MaterialVersion[];
  caliberChanged: boolean;
  relatedPointIds: string[];
}

export type MergeEvidenceType = 'name_similarity' | 'containment' | 'alias' | 'location_proximity' | 'manual_note';
export interface MergeEvidence {
  id: string;
  type: MergeEvidenceType;
  writingA: string;
  writingB: string;
  materialRefA: string;
  materialRefB: string;
}

export interface MergeRelation {
  id: string;
  pointIds: string[];
  canonicalName: string;
  status: MergeStatus;
  confidence: number;
  evidence: MergeEvidence[];
  operator?: string;
  operateTime?: string;
  evidenceNote: string;
}

export interface Anomaly {
  id: string;
  pointId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  relatedMaterialId?: string;
  relatedMergeId?: string;
  resolved: boolean;
  detectedAt: string;
}

export interface Remark {
  id: string;
  pointId?: string;
  mergeId?: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface OperationLog {
  id: string;
  operator: string;
  action: string;
  target: string;
  targetType: 'point' | 'material' | 'merge' | 'anomaly' | 'system';
  reason: string;
  timestamp: string;
}

export interface PageSummary {
  totalPoints: number;
  abnormalCount: number;
  pendingCount: number;
  mergedCount: number;
  lastRerunTime: string;
  lastExportTime: string;
  currentVersion: string;
}

export interface HighlightState {
  type: 'material' | 'point' | 'anomaly' | null;
  id: string | null;
  triggeredAt: number | null;
}

export interface VersionCompareState {
  materialId: string | null;
  vA: number;
  vB: number;
  open: boolean;
}
