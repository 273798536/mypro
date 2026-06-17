export type MaterialType = "old_table" | "supplementary" | "missing_unit" | "clean";

export type SampleStatus = "clean" | "dirty" | "fixed" | "leak";

export type RemediationKind = "rerun" | "supplementary" | "manualConfirm";

export interface Material {
  type: MaterialType;
  label: string;
  content: string;
  note?: string;
}

export interface PromptVersion {
  id: string;
  version: string;
  createdAt: string;
  author: string;
  changeLog: string;
  diff: string;
  active: boolean;
}

export interface Annotation {
  id: string;
  author: string;
  time: string;
  content: string;
  tag: string;
}

export interface ProcessingOpinion {
  id: string;
  author: string;
  opinion: string;
  decision: "采纳" | "驳回" | "待定";
}

export interface ManualCorrection {
  from: string;
  to: string;
  reason: string;
  by: string;
  time: string;
}

export interface RemediationAction {
  tried: boolean;
  result: string;
  time: string;
}

export interface ValidationLeak {
  id: string;
  sampleId: string;
  description: string;
  rerun: RemediationAction;
  supplementary: RemediationAction;
  manualConfirm: RemediationAction;
}

export interface Sample {
  id: string;
  question: string;
  group: string;
  materials: Material[];
  promptVersionId: string;
  groundTruth: string;
  offlinePred: string;
  onlinePred: string;
  offlineMetric: number;
  onlineMetric: number;
  status: SampleStatus;
  stuckMaterial?: string;
  stuckCount?: number;
  annotations: Annotation[];
  opinions: ProcessingOpinion[];
  correction?: ManualCorrection;
}

export interface GroupMetric {
  group: string;
  offlineScore: number;
  onlineScore: number;
  gap: number;
  dirtyCount: number;
  total: number;
}

export type DiffKind = "equal" | "add" | "del";

export interface DiffSegment {
  kind: DiffKind;
  text: string;
}

export interface ReplayRecord {
  id: string;
  sampleId: string;
  sampleLabel: string;
  beforeJudgment: string;
  afterJudgment: string;
  changed: boolean;
  time: string;
  trigger: string;
}
