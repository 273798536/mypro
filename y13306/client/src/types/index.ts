export enum EvaluationStatus {
  PENDING = 'PENDING',
  EVALUATED = 'EVALUATED',
  WITHDRAWN = 'WITHDRAWN',
  CONFIRMED = 'CONFIRMED',
  REVISED = 'REVISED',
  DUPLICATE = 'DUPLICATE',
}

export enum ModelType {
  OLD = 'OLD',
  NEW = 'NEW',
  GRAY = 'GRAY',
}

export const STATUS_TEXT_MAP: Record<EvaluationStatus, string> = {
  [EvaluationStatus.PENDING]: '待评测',
  [EvaluationStatus.EVALUATED]: '已评测',
  [EvaluationStatus.WITHDRAWN]: '已撤回',
  [EvaluationStatus.CONFIRMED]: '已人工确认',
  [EvaluationStatus.REVISED]: '已改判',
  [EvaluationStatus.DUPLICATE]: '重复评测',
};

export const STATUS_COLOR_MAP: Record<EvaluationStatus, string> = {
  [EvaluationStatus.PENDING]: 'default',
  [EvaluationStatus.EVALUATED]: 'processing',
  [EvaluationStatus.WITHDRAWN]: 'warning',
  [EvaluationStatus.CONFIRMED]: 'success',
  [EvaluationStatus.REVISED]: 'purple',
  [EvaluationStatus.DUPLICATE]: 'default',
};

export const MODEL_TYPE_TEXT_MAP: Record<ModelType, string> = {
  [ModelType.OLD]: '旧模型',
  [ModelType.NEW]: '新模型',
  [ModelType.GRAY]: '灰度模型',
};

export interface ModelVersion {
  id: string;
  name: string;
  version: string;
  type: ModelType;
  description?: string;
  createdAt: string;
}

export interface ChangeHistory {
  id: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changeReason?: string;
  operator?: string;
  operationType: string;
  createdAt: string;
}

export interface WithdrawalInfo {
  id: string;
  reason: string;
  operator: string;
  createdAt: string;
  linkedConclusionId?: string;
}

export interface FinalConclusionInfo {
  id: string;
  status: EvaluationStatus;
  statusText: string;
  isCorrect?: boolean;
  judgeReason?: string;
  revisionReason?: string;
}

export interface RevisionComparison {
  oldModelVersion?: {
    name: string;
    version: string;
    type: ModelType;
  };
  oldIsCorrect?: boolean;
  oldJudgeReason?: string;
  newModelVersion: {
    name: string;
    version: string;
    type: ModelType;
  };
  newIsCorrect: boolean;
  newJudgeReason?: string;
  revisionExplanation: string;
}

export interface EvaluationRecord {
  id: string;
  batchId: string;
  medicalRecordId: string;
  questionId: string;
  questionContent: string;
  modelAnswer: string;
  standardAnswer?: string;
  isCorrect?: boolean;
  confidence?: number;
  errorType?: string;
  status: EvaluationStatus;
  statusText: string;
  judgeReason?: string;
  revisionReason?: string;
  isDuplicate: boolean;
  duplicateOfId?: string;
  duplicateInfo?: {
    id: string;
    medicalRecordId: string;
    questionId: string;
  };
  hasWithdrawal: boolean;
  withdrawalInfo?: WithdrawalInfo;
  finalConclusionId?: string;
  finalConclusionInfo?: FinalConclusionInfo;
  modelVersion: {
    id: string;
    name: string;
    version: string;
    type: ModelType;
  };
  changeHistories: ChangeHistory[];
  revisionComparison?: RevisionComparison;
  createdAt: string;
  evaluatedAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export interface Statistics {
  total: number;
  evaluated: number;
  pending: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  withdrawn: number;
  confirmed: number;
  revised: number;
  duplicates: number;
  hasWithdrawals: number;
}

export interface ListResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
