export interface Point {
  x: number;
  y: number;
}

export interface AdjacentPoint extends Point {
  id: string;
  name: string;
  status: 'normal' | 'mismatch' | 'warning';
}

export type ReviewStatus = 'pending' | 'processing' | 'completed' | 'anomaly';

export interface Review {
  id: string;
  title: string;
  status: ReviewStatus;
  location: string;
  point: Point;
  adjacentPoints: AdjacentPoint[];
  createdAt: string;
  updatedAt: string;
  hasAnomaly: boolean;
}

export interface SceneMeta {
  reviewId: string;
  sceneLabels: string[];
  sideNote: string;
  pageSummary: string;
  sideNoteManual: boolean;
  pageSummaryManual: boolean;
  updatedAt: string;
  updatedBy: string;
}

export type MaterialType = 'drainage_design' | 'survey_report' | 'approval' | 'other';

export interface ChatRecord {
  id: string;
  speaker: string;
  content: string;
  time: string;
  isLeader: boolean;
}

export interface Material {
  id: string;
  reviewId: string;
  name: string;
  type: MaterialType;
  batchNo: number;
  uploadTime: string;
  uploader: string;
  chatRecords: ChatRecord[];
}

export interface Judgment {
  id: string;
  reviewId: string;
  content: string;
  reason: string;
  operator: string;
  createdAt: string;
  isCurrent: boolean;
  version: number;
}

export interface Photo {
  id: string;
  reviewId: string;
  url: string;
  locationDesc: string;
  changeNote: string;
  uploadTime: string;
  uploader: string;
  point: Point;
}

export type AnomalyType = 'adjacent_mismatch' | 'insufficient_material' | 'data_conflict';

export interface Anomaly {
  id: string;
  reviewId: string;
  type: AnomalyType;
  title: string;
  description: string;
  impact: string;
  nextSteps: string[];
  resolved: boolean;
  resolvedAt?: string;
}
