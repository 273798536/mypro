export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Recording {
  id: string;
  projectId: string;
  fileName: string;
  fileHash: string;
  uploadedAt: number;
}

export interface Track {
  id: string;
  recordingId: string;
  partName: string;
  fileName: string;
  fileHash: string;
}

export interface PitchPoint {
  time: number;
  frequency: number;
  midiNote: number;
  deviation: number;
}

export type IssueType = "part_misalignment" | "unmarked_modulation" | "audio_gap";

export type IssueSeverity = "warning" | "error";

export interface Issue {
  id: string;
  type: IssueType;
  startTime: number;
  endTime: number;
  severity: IssueSeverity;
  triggerMaterial: string;
  stuckAt: string;
  nextStep: string;
  partName?: string;
  measureRange?: string;
}

export interface AnalysisResult {
  id: string;
  recordingId: string;
  fileHash: string;
  pitchData: PitchPoint[];
  detectedIssues: Issue[];
  computedAt: number;
}

export type CaseStatus = "open" | "resolved";

export interface Annotation {
  id: string;
  caseId: string;
  content: string;
  author: string;
  createdAt: number;
  linkedClue: string;
}

export interface Case {
  id: string;
  projectId: string;
  title: string;
  linkedRecordings: string[];
  linkedMeasures: string[];
  issues: Issue[];
  annotations: Annotation[];
  status: CaseStatus;
  createdAt: number;
  updatedAt: number;
}

export interface MaterialTrace {
  recordingId: string;
  recordingFileName: string;
  trackId: string;
  trackFileName: string;
  trackPartName: string;
  reportId: string;
  reportGeneratedAt: number;
}

export interface Report {
  id: string;
  projectId: string;
  generatedAt: number;
}

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  part_misalignment: "声部错位",
  unmarked_modulation: "转调漏标",
  audio_gap: "音频缺段",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  warning: "警告",
  error: "错误",
};
