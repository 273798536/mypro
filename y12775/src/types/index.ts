export type ResultStatus = 'PASS' | 'REVIEW' | 'FAIL';

export interface Reagent {
  id: string;
  code: string;
  name: string;
  batchNo: string;
  purity: string;
  expiryDate: string;
  remark: string;
  status: 'available' | 'expired' | 'low';
  createdAt: string;
}

export interface Batch {
  id: string;
  batchNo: string;
  createDate: string;
  operator: string;
  remark: string;
}

export interface Experiment {
  id: string;
  sampleNo: string;
  batchId: string;
  reagentId: string;
  sampleMass: number;
  dryMass: number;
  blankControl: number | null;
  parallelCount: number;
  parallelResults?: number[];
  createTime: string;
}

export interface CalculationResult {
  id: string;
  experimentId: string;
  waterContent: number;
  status: ResultStatus;
  formula: string;
  formulaDetail: string;
  failureReason?: string;
  safetyTip: string;
  retestAdvice?: string;
  blankFallback: boolean;
  blankFallbackValue?: number;
  sourceTrace: string;
  parallelDeviation?: number;
  applicableRange: string;
  unit: string;
  calculatedAt: string;
}

export interface RetestRecord {
  id: string;
  resultId: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  step: string;
  createdAt: string;
}

export interface ReagentRemarkParsed {
  concentration?: string;
  batchNo?: string;
  expiryDate?: string;
  storageCondition?: string;
}

export interface DataQualityIssue {
  type: 'empty' | 'duplicate' | 'remark_mixed';
  field?: string;
  description: string;
  reagentId?: string;
}
