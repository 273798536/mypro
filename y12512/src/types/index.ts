export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SourceInfo {
  id: string;
  name: string;
  source: string;
  importedAt: string;
  version: string;
}

export interface StageModel extends SourceInfo {
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  obstacles: Obstacle[];
}

export interface Obstacle {
  id: string;
  name: string;
  position: Vector3;
  size: Vector3;
  type: 'speaker' | 'truss' | 'equipment' | 'backdrop';
}

export interface SmokeMachine extends SourceInfo {
  position: Vector3;
  direction: Vector3;
  emissionRate: number;
  particleSize: number;
  spread: number;
  speed: number;
  color: string;
  startTime: number;
  endTime: number;
  enabled: boolean;
}

export interface StageLight extends SourceInfo {
  position: Vector3;
  target: Vector3;
  color: string;
  intensity: number;
  type: 'spot' | 'wash' | 'beam';
  enabled: boolean;
  coneAngle: number;
}

export interface WindConfig {
  direction: Vector3;
  speed: number;
  turbulence: number;
  startTime: number;
  endTime: number;
}

export interface SmokeParticle {
  id: string;
  position: Vector3;
  velocity: Vector3;
  size: number;
  opacity: number;
  age: number;
  maxAge: number;
  sourceMachineId: string;
}

export enum IssueType {
  SMOKE_OBSTRUCTION = 'smoke_obstruction',
  WIND_DIRECTION_ERROR = 'wind_direction_error',
  LIGHT_PENETRATION = 'light_penetration',
  DUPLICATE_IMPORT = 'duplicate_import',
  ABNORMAL_RETENTION = 'abnormal_retention',
  EXPORT_MISMATCH = 'export_mismatch',
}

export enum IssueSeverity {
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info',
}

export enum IssueStatus {
  PENDING_REVIEW = 'pending_review',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
}

export interface Issue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  title: string;
  description: string;
  relatedObjectIds: string[];
  relatedObjectTypes: string[];
  timestamp: number;
  detectedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface VisibilitySample {
  timestamp: number;
  position: Vector3;
  visibility: number;
  smokeDensity: number;
}

export interface EffectReport extends SourceInfo {
  startTime: number;
  endTime: number;
  averageVisibility: number;
  minVisibility: number;
  maxVisibility: number;
  issueCount: number;
  samples: VisibilitySample[];
  generatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  objectId: string;
  objectType: string;
  timestamp: string;
  user: string;
  details: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  issues: Issue[];
  checks: {
    duplicateImports: boolean;
    abnormalRetention: boolean;
    exportConsistency: boolean;
  };
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface FilterState {
  selectedObjectIds: string[];
  selectedIssueTypes: IssueType[];
  timeRange: TimeRange;
  showSmoke: boolean;
  showStage: boolean;
  showLights: boolean;
  showMachines: boolean;
  showObstacles: boolean;
  showFlowArrows: boolean;
  visibilityThreshold: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
}

export interface ExportState {
  lastExportData: string | null;
  lastExportAt: string | null;
  exportCount: number;
}
