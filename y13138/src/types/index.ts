export interface ParamRow {
  id: string;
  name: string;
  value: number;
  unit: string;
  sourceRecordId?: string;
  remark: string;
  isBoundary: boolean;
  isLateAttachment: boolean;
}

export interface ParamGroup {
  id: 'A' | 'B';
  label: string;
  rows: ParamRow[];
}

export interface MarkovNode {
  id: string;
  romanLabel: string;
  displayName: string;
  steadyProb: number;
  initialProb: number;
  sampleCount: number;
  isAbnormal: boolean;
  abnormalReason?: string;
  overflowWarning?: string;
  relatedParamIds: string[];
  relatedRecordIds: string[];
  x: number;
  y: number;
}

export interface MarkovEdge {
  id: string;
  from: string;
  to: string;
  probability: number;
  isCalcVisible: boolean;
  calcSteps: string[];
}

export type RecordType = 'success' | 'late' | 'abnormal' | 'overflow';
export type EvidenceStatus = 'processed' | 'pending' | 'abnormal';

export interface RawRecord {
  id: string;
  type: RecordType;
  typeLabel: string;
  summary: string;
  collectTime: string;
  recorder: string;
  originalValue: number;
  originalUnit: string;
  convertedValue: number;
  convertedUnit: string;
  conversionSteps: string[];
  relatedParamIds: string[];
  evidenceStatus: EvidenceStatus;
}

export type TraceStepType = 'node' | 'param' | 'record' | 'calc';

export interface TraceStep {
  id: string;
  stepType: TraceStepType;
  title: string;
  content: string;
  refId?: string;
  expanded: boolean;
  children?: TraceStep[];
}

export interface EvidenceItem {
  id: string;
  recordId: string;
  title: string;
  status: EvidenceStatus;
  statusLabel: string;
  summary: string;
  jumpTarget: string;
}

export interface CompareDiffRow {
  paramId: string;
  paramName: string;
  valueA: number;
  valueB: number;
  unit: string;
  isDiff: boolean;
  calcStepsA: string[];
  calcStepsB: string[];
  unitConvertNote?: string;
}

export interface SteadyCalcResult {
  steadyVector: number[];
  equations: string[];
  eliminationSteps: string[];
  convergenceNote: string;
  isConverged: boolean;
}

export interface BoundaryCheckResult {
  nodeId: string;
  isAbnormal: boolean;
  sampleCount: number;
  threshold: number;
  thresholdParamId: string;
  reason: string;
}

export interface OverflowCheckResult {
  hasOverflow: boolean;
  stepIndex: number;
  probability: number;
  safeLimit: number;
  note: string;
}
