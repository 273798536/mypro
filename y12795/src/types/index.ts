export type BlankControlStatus = '有' | '无' | '缺失';

export type BatchStatus = '录入中' | '计算中' | '待复核' | '已完成';

export type ResultGrade = '通过' | '建议复测' | '必须复核';

export type ReviewItemStatus = '待复核' | '已通过' | '需复测';

export type TimelineEventType = '录入' | '计算' | '复核' | '导出';

export interface WeighingRow {
  id: string;
  batchId: string;
  originalRowNumber: number;
  sampleName: string;
  sampleMass: number | null;
  benzoicAcidMass: number | null;
  imageName: string;
  remark: string;
}

export interface ExperimentRecord {
  id: string;
  batchId: string;
  originalRowNumber: number;
  initialTemp: number | null;
  finalTemp: number | null;
  tempChange: number | null;
  blankControl: BlankControlStatus;
  imageName: string;
  remark: string;
}

export interface ReactionTime {
  id: string;
  batchId: string;
  originalRowNumber: number;
  ignitionTime: number | null;
  totalDuration: number | null;
  isMissing: boolean;
  remark: string;
}

export interface ReviewItem {
  id: string;
  batchId: string;
  category: '称量单' | '实验记录' | '反应时间';
  itemName: string;
  status: ReviewItemStatus;
  reason: string;
  reviewer: string;
  reviewedAt: string;
  sourceRef: string;
  errorCode?: string;
}

export interface CalculationResult {
  id: string;
  batchId: string;
  type: '燃烧热' | '浓度换算';
  value: number;
  unit: string;
  formula: string;
  scope: string;
  grade: ResultGrade;
  suggestion: string;
  details?: Record<string, number | string>;
}

export interface TimelineEvent {
  id: string;
  batchId: string;
  type: TimelineEventType;
  description: string;
  operator: string;
  timestamp: string;
  sourceRef: string;
}

export interface Batch {
  id: string;
  name: string;
  operator: string;
  createdAt: string;
  status: BatchStatus;
  sourceNote: string;
}

export interface FailureReason {
  code: string;
  title: string;
  trigger: string;
  explanation: string;
  suggestion: string;
}

export interface CombustionParams {
  waterEquivalent: number;
  initialTemp: number;
  finalTemp: number;
  tempCorrection: number;
  wireHeat: number;
  wireMass: number;
  sampleMass: number;
}

export interface ConcentrationParams {
  mass: number;
  molarMass: number;
  volume: number;
}
