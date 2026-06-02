export interface Preset {
  id: string;
  name: string;
  description: string;
  pluginName: string;
  category: string;
  createdAt: number;
  updatedAt: number;
  source: string;
  authorId: string;
  authorName: string;
  currentVersionId: string;
  tags: string[];
}

export interface PresetVersion {
  id: string;
  presetId: string;
  versionNumber: string;
  parentVersionId?: string;
  name: string;
  description: string;
  parameters: PresetParameter[];
  fileHash: string;
  fileSize: number;
  createdAt: number;
  createdBy: string;
  sourceInfo: SourceInfo;
  isOverride: boolean;
  overrideReason?: string;
}

export interface PresetParameter {
  id: string;
  name: string;
  path: string;
  value: number;
  minValue: number;
  maxValue: number;
  unit: string;
  type: string;
  options?: string[];
}

export interface SourceInfo {
  type: string;
  fileName: string;
  fileType: string;
  uploadDate: number;
  importedFrom?: string;
  originalVersion?: string;
}

export interface Snapshot {
  id: string;
  name: string;
  presetVersionId: string;
  presetName: string;
  parameters: SnapshotParameter[];
  createdAt: number;
  createdBy: string;
  creatorName: string;
  assignmentId?: string;
  notes: string;
  comparisonResult?: ComparisonResult;
}

export interface SnapshotParameter {
  parameterId: string;
  name: string;
  path: string;
  value: number;
  isModified: boolean;
  isOutOfBounds: boolean;
  boundsStatus: 'normal' | 'below_min' | 'above_max';
}

export interface ComparisonResult {
  totalParameters: number;
  modifiedCount: number;
  outOfBoundsCount: number;
  anomalies: Anomaly[];
  comparedAt: number;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  snapshotId: string;
  presetVersionId: string;
  audioFileId?: string;
  createdAt: number;
  submittedAt?: number;
  status: string;
  annotations: Annotation[];
  grade?: number;
  feedback?: string;
}

export interface Annotation {
  id: string;
  assignmentId: string;
  parameterId?: string;
  parameterPath?: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'student';
  content: string;
  createdAt: number;
  isResolved: boolean;
}

export interface Anomaly {
  id: string;
  type: 'version_override' | 'parameter_out_of_bounds' | 'audio_missing' | 'mismatch';
  severity: 'critical' | 'warning' | 'info';
  status: 'open' | 'acknowledged' | 'resolved';
  entityType: string;
  entityId: string;
  entityName: string;
  description: string;
  affectedItems: AffectedItem[];
  impactExplanation: string;
  detectedAt: number;
  detectedBy: string;
  resolvedAt?: number;
  resolverId?: string;
  resolutionNotes?: string;
}

export interface AffectedItem {
  id: string;
  type: string;
  name: string;
  path?: string;
  description: string;
}

export interface AudioFile {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  duration: number;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  dataUrl: string;
  fileHash: string;
  uploadedAt: number;
  uploadedBy: string;
  assignmentId?: string;
}

export interface Sandbox {
  id: string;
  name: string;
  createdAt: number;
  path: string;
  status: string;
  runs: SandboxRun[];
}

export interface SandboxRun {
  id: string;
  sandboxId: string;
  runNumber: number;
  startTime: number;
  endTime?: number;
  inputFiles: string[];
  outputFiles: string[];
  results: SandboxResult;
  isIdempotent?: boolean;
  diffFromPrevious?: SandboxDiff[];
}

export interface SandboxResult {
  id: string;
  presetVersionId: string;
  parameters: PresetParameter[];
  outputHash: string;
  anomalies: Anomaly[];
}

export interface SandboxDiff {
  type: string;
  name: string;
  expected: string;
  actual: string;
}

export interface VersionDiff {
  parameterId: string;
  parameterName: string;
  parameterPath: string;
  baselineValue: number;
  comparedValue: number;
  difference: number;
  percentage: number;
  isSignificant: boolean;
  isOutOfBounds: boolean;
  boundsStatus: 'normal' | 'below_min' | 'above_max';
}
