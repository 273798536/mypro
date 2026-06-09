export type CoordinateSystem = 'MNI' | 'Talairach' | 'Native';

export type RecordStatus = 'normal' | 'pending' | 'invalid';

export type Severity = 'low' | 'medium' | 'high';

export type ValidationType =
  | 'coordinate_mismatch'
  | 'timestamp_desync'
  | 'parameter_outlier';

export type ValidationSeverity = 'warning' | 'error';

export type ReviewStatus = 'pass' | 'warning' | 'fail';

export interface BrainRegion {
  id: string;
  name: string;
  abbr: string;
  position: [number, number, number];
  lobe: string;
}

export interface RiskNote {
  id: string;
  content: string;
  createdAt: string;
  author: string;
  severity: Severity;
}

export interface ValidationIssue {
  type: ValidationType;
  severity: ValidationSeverity;
  message: string;
  detail: string;
}

export interface ConnectionParameters {
  tractLength: number;
  faValue: number;
  mdValue: number;
  streamlineCount: number;
}

export interface ConnectionRecord {
  id: string;
  fromRegion: string;
  toRegion: string;
  strength: number;
  coordinateSystem: CoordinateSystem;
  timestamp: string;
  acquisitionTime: string;
  status: RecordStatus;
  outOfBounds: boolean;
  outOfBoundsReason?: string;
  riskNotes: RiskNote[];
  parameters: ConnectionParameters;
  validationIssues: ValidationIssue[];
}

export interface SavedViewpoint {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  createdAt: string;
  screenshot?: string;
  relatedRecordIds: string[];
}

export interface ReviewState {
  timeParamsConsistent: ReviewStatus;
  screenshotChecklistComplete: ReviewStatus;
  timelineSynchronized: ReviewStatus;
  lastRunId: string;
  lastRunAt: string;
}

export interface RunIdentifier {
  id: string;
  startedAt: string;
  label: string;
}

export interface ColorLegendItem {
  key: string;
  color: string;
  label: string;
  description: string;
}
