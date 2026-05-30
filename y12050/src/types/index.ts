export interface ScanParams {
  TR: number;
  TE: number;
  sliceThickness: number;
  FOV: number;
  matrix: number;
  NEX: number;
}

export type RowType = 'normal' | 'empty' | 'comment' | 'missing_column' | 'noise' | 'conflict';

export interface RawParamRow {
  lineNumber: number;
  content: string;
  type: RowType;
  paramName?: string;
  paramValue?: number;
  errorMessage?: string;
}

export interface ParseResult {
  validParams: Partial<ScanParams>;
  badRows: RawParamRow[];
  totalRows: number;
  validRows: number;
}

export type ConflictSeverity = 'warning' | 'error' | 'fatal';

export interface ParamConflict {
  params: string[];
  message: string;
  severity: ConflictSeverity;
}

export interface ScoreItem {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  explanation: string;
  relatedParams: string[];
}

export interface ImageQuality {
  snr: number;
  contrast: number;
  resolution: number;
  artifacts: string[];
}

export interface SettlementResult {
  totalScore: number;
  maxScore: number;
  scoreItems: ScoreItem[];
  scanTime: number;
  timeBudget: number;
  isTimeExceeded: boolean;
  conflicts: ParamConflict[];
  badRows: RawParamRow[];
  artifactTypes: string[];
  params: ScanParams;
  timestamp: number;
  imageQuality: ImageQuality;
}

export interface ParamRange {
  min: number;
  max: number;
  step: number;
}

export interface Level {
  id: string;
  name: string;
  targetPart: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeBudget: number;
  description: string;
  optimalParams: ScanParams;
  paramRanges: Record<keyof ScanParams, ParamRange>;
  rawTemplate: string;
}

export interface ReviewCase {
  id: string;
  levelId: string;
  levelName: string;
  params: ScanParams;
  result: SettlementResult;
  studentName: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewTimestamp?: number;
}

export type UserRole = 'student' | 'instructor';
