export type RecordStatus =
  | 'pending'
  | 'confirmed'
  | 'revoked'
  | 'need_evidence'
  | 'manual_overruled';

export type BoundaryResult = 'pass' | 'fail' | 'unknown';

export interface TopoRecord {
  id: string;
  recordNo: string;
  paramVersion: string;
  status: RecordStatus;
  boundaryResult: BoundaryResult;
  remark: string;
  isLateSubmission: boolean;
  noMismatch: boolean;
  createdAt: string;
  updatedAt: string;
  currentVersion: number;
}

export interface RecordVersion {
  id: string;
  recordId: string;
  version: number;
  status: RecordStatus;
  boundaryResult: BoundaryResult;
  remark: string;
  paramVersion: string;
  operator: string;
  changedAt: string;
}

export interface ComputationStep {
  stepId: number;
  title: string;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  passed: boolean;
  contributesToConclusion: boolean;
  timestamp: string;
}

export interface HandoverSummary {
  confirmed: { count: number; items: TopoRecord[] };
  needEvidence: { count: number; items: TopoRecord[] };
  manualOverruled: { count: number; items: TopoRecord[] };
}

export interface ImportRecordInput {
  recordNo: string;
  paramVersion: string;
  remark?: string;
  isLateSubmission?: boolean;
}

export interface UpdateRecordInput {
  status?: RecordStatus;
  remark?: string;
  boundaryResult?: BoundaryResult;
  operator: string;
}

export const STATUS_LABEL: Record<RecordStatus, string> = {
  pending: '待复核',
  confirmed: '已处理',
  revoked: '已撤回',
  need_evidence: '待补证据',
  manual_overruled: '人工改判',
};

export const RESULT_LABEL: Record<BoundaryResult, string> = {
  pass: '通过',
  fail: '不通过',
  unknown: '未知',
};
