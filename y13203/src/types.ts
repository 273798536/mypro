export interface Anomaly {
  id: string;
  channel: string;
  session: string;
  status: "pending" | "confirmed" | "overridden";
  value: number;
  threshold: number;
  thresholdUpper: number;
  isBoundary: boolean;
  boundaryReason: string;
  originalJudgment: string;
  currentJudgment: string;
}

export interface Annotation {
  id: string;
  anomalyId: string;
  content: string;
  author: string;
  impactScope: string[];
  sourceLine: string;
  createdAt: string;
}

export interface AuthorizationNote {
  id: string;
  content: string;
  author: string;
  affectedFiles: string[];
  affectedTracks: string[];
  affectedChecklist: string[];
  createdAt: string;
}

export interface ChangeRecord {
  id: string;
  type: "annotation" | "authorization" | "override";
  description: string;
  impactScope: string[];
  sourceLine: string;
  author: string;
  beforeValue: string;
  afterValue: string;
  createdAt: string;
}

export interface AlignmentItem {
  id: string;
  fileName: string;
  trackName: string;
  checklistEntry: string;
  alignmentStatus: "aligned" | "offset";
  note: string;
}
