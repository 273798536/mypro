export type BatchStatus = 'pending' | 'running' | 'completed' | 'revised';
export type MaterialType = 'bank_flow' | 'name_mismatch' | 'supplementary';
export type PaymentStatus = 'matched' | 'unmatched' | 'revised';

export interface Material {
  id: string;
  type: MaterialType;
  name: string;
  uploadedAt: string;
  content: string;
  isDuplicate?: boolean;
}

export interface PaymentSplit {
  id: string;
  sourceRow: number;
  affectedScope: string[];
  amount: number;
  tax: number;
  status: PaymentStatus;
  remark?: string;
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  operator: string;
  oldMaterials: Material[];
  newRemark: string;
  reviseReason: string;
  oldConclusion: string;
  newConclusion: string;
}

export interface Batch {
  id: string;
  batchNo: string;
  date: string;
  status: BatchStatus;
  materials: Material[];
  payments: PaymentSplit[];
  conclusion: string;
  history: HistoryRecord[];
  materialCount: number;
  conclusionSummary: string;
}

export interface StartBatchReq {
  force?: boolean;
}

export interface ReviseConclusionReq {
  newConclusion: string;
  reviseReason: string;
  newRemark?: string;
}

export interface ExportCSVRes {
  filename: string;
  content: string;
  consistencyVerified: boolean;
}

export const STATUS_LABEL: Record<BatchStatus, string> = {
  pending: '待启动',
  running: '复核中',
  completed: '已完成',
  revised: '已改判',
};

export const MATERIAL_LABEL: Record<MaterialType, string> = {
  bank_flow: '银行流水',
  name_mismatch: '名称不一致',
  supplementary: '后补说明',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  matched: '已匹配',
  unmatched: '未匹配',
  revised: '已改判',
};
