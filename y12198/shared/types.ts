export interface ScoreVersion {
  id: string;
  name: string;
  version: string;
  totalPages: number;
  createdAt: string;
  createdBy: string;
}

export type AnnotationType = 'bowing' | 'dynamics' | 'page';

export interface Annotation {
  id: string;
  scoreVersionId: string;
  pageNumber: number;
  type: AnnotationType;
  content: string;
  explanation: string;
  source: string;
  createdBy: string;
  createdAt: string;
}

export type SectionType = 'string' | 'woodwind' | 'brass' | 'percussion';
export type PartStatus = 'distributed' | 'confirmed' | 'outdated' | 'pending';

export interface Part {
  id: string;
  name: string;
  section: SectionType;
  currentVersion: string;
  distributedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  status: PartStatus;
}

export type IssueType = 'page_mismatch' | 'old_version' | 'duplicate_annotation' | 'unconfirmed';
export type IssueSeverity = 'high' | 'medium' | 'low';

export interface ReconciliationIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  partId: string;
  annotationId?: string;
  description: string;
  resolved: boolean;
}

export interface TraceNode {
  id: string;
  type: 'annotation' | 'version' | 'distribution' | 'confirmation';
  title: string;
  description: string;
  operator: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
