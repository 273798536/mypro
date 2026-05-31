export interface BondHolding {
  bondId: string;
  bondName: string;
  industry: string;
  duration: number;
  yield: number;
  weight: number | null;
  faceValue: number;
  source: string;
  importTime: Date;
}

export interface Version {
  versionId: string;
  name: string;
  description: string;
  source: string;
  createdAt: Date;
  createdBy: string;
  parentVersion: string | null;
  holdingCount: number;
}

export interface AnalysisParams {
  durationRange: [number, number];
  yieldRange: [number, number];
  industries: string[];
  weightThreshold: number;
  showOutliers: boolean;
  surfaceSmoothing: number;
}

export interface SurfacePoint {
  x: number;
  y: number;
  z: number;
  bondIds: string[];
  isOutlier: boolean;
  annotation?: string;
}

export interface AnalysisResult {
  analysisId: string;
  versionId: string;
  parameters: AnalysisParams;
  avgDuration: number;
  weightedDuration: number;
  avgYield: number;
  durationConclusion: string;
  surfaceData: SurfacePoint[][];
  createdAt: Date;
}

export type QualityIssueType = 'weight_missing' | 'outlier' | 'industry_conflict' | 'invalid_value';
export type QualityIssueSeverity = 'low' | 'medium' | 'high';

export interface QualityIssue {
  issueId: string;
  bondId: string;
  type: QualityIssueType;
  severity: QualityIssueSeverity;
  description: string;
  impact: string;
  affectedResults: string[];
  resolved: boolean;
}

export type AnnotationType = 'filter_impact' | 'manual_note' | 'quality_issue';

export interface Annotation {
  annotationId: string;
  analysisId: string;
  type: AnnotationType;
  x: number;
  y: number;
  z: number;
  content: string;
  createdBy: string;
  createdAt: Date;
}

export interface ExportRecord {
  exportId: string;
  analysisId: string;
  format: 'pdf' | 'excel';
  fileName: string;
  fileHash: string;
  durationConclusion: string;
  pageDurationConclusion: string;
  terminalDurationConclusion: string;
  consistencyPassed: boolean;
  exportedAt: Date;
  exportedBy: string;
}

export interface ExportCorrespondence {
  exportId: string;
  holdingSnapshot: BondHolding[];
  analysisSnapshot: AnalysisResult;
  parametersSnapshot: AnalysisParams;
  terminalLog: string;
}

export interface TerminalLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: unknown;
}
