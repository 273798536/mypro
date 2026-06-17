import { EvaluationStatus, ModelType } from '@prisma/client';

export interface EvaluationRecordCreateInput {
  batchId: string;
  medicalRecordId: string;
  questionId: string;
  questionContent: string;
  modelAnswer: string;
  standardAnswer?: string;
  modelVersionId: string;
  isCorrect?: boolean;
  confidence?: number;
  errorType?: string;
  judgeReason?: string;
}

export interface EvaluationRecordDetail {
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
  withdrawalInfo?: {
    id: string;
    reason: string;
    operator: string;
    createdAt: string;
    linkedConclusionId?: string;
  };
  finalConclusionId?: string;
  finalConclusionInfo?: {
    id: string;
    status: EvaluationStatus;
    statusText: string;
    isCorrect?: boolean;
    judgeReason?: string;
    revisionReason?: string;
  };
  modelVersion: {
    id: string;
    name: string;
    version: string;
    type: ModelType;
  };
  changeHistories: Array<{
    id: string;
    fieldName: string;
    oldValue?: string;
    newValue?: string;
    changeReason?: string;
    operator?: string;
    operationType: string;
    createdAt: string;
  }>;
  revisionComparison?: {
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
  };
  createdAt: string;
  evaluatedAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export const STATUS_TEXT_MAP: Record<EvaluationStatus, string> = {
  [EvaluationStatus.PENDING]: '待评测',
  [EvaluationStatus.EVALUATED]: '已评测',
  [EvaluationStatus.WITHDRAWN]: '已撤回',
  [EvaluationStatus.CONFIRMED]: '已人工确认',
  [EvaluationStatus.REVISED]: '已改判',
  [EvaluationStatus.DUPLICATE]: '重复评测',
};

export const MODEL_TYPE_TEXT_MAP: Record<ModelType, string> = {
  [ModelType.OLD]: '旧模型',
  [ModelType.NEW]: '新模型',
  [ModelType.GRAY]: '灰度模型',
};
