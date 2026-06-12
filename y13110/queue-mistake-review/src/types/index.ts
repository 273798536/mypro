export enum ProcessStatus {
  PENDING = 'pending',
  UNIT_CHECKING = 'unit_checking',
  NEEDS_MANUAL_CONFIRM = 'needs_manual_confirm',
  PROCESSING = 'processing',
  REVIEWED = 'reviewed',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export const ProcessStatusLabel: Record<ProcessStatus, string> = {
  [ProcessStatus.PENDING]: '待处理',
  [ProcessStatus.UNIT_CHECKING]: '单位校验中',
  [ProcessStatus.NEEDS_MANUAL_CONFIRM]: '待人工确认',
  [ProcessStatus.PROCESSING]: '处理中',
  [ProcessStatus.REVIEWED]: '已复盘',
  [ProcessStatus.COMPLETED]: '已完成',
  [ProcessStatus.ARCHIVED]: '已归档'
}

export const ProcessStatusColor: Record<ProcessStatus, string> = {
  [ProcessStatus.PENDING]: 'bg-gray-100 text-gray-600',
  [ProcessStatus.UNIT_CHECKING]: 'bg-blue-100 text-blue-600',
  [ProcessStatus.NEEDS_MANUAL_CONFIRM]: 'bg-warning-100 text-warning-600',
  [ProcessStatus.PROCESSING]: 'bg-primary-100 text-primary-600',
  [ProcessStatus.REVIEWED]: 'bg-success-100 text-success-600',
  [ProcessStatus.COMPLETED]: 'bg-green-100 text-green-600',
  [ProcessStatus.ARCHIVED]: 'bg-gray-100 text-gray-500'
}

export type DataSource = 'manual' | 'import_old' | 'import_new' | 'api_sync';

export const DataSourceLabel: Record<DataSource, string> = {
  manual: '手工录入',
  import_old: '旧系统导入',
  import_new: '新系统导入',
  api_sync: '接口同步'
}

export interface UnitInfo {
  value: number;
  unit: string;
  rawText?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  uploadTime: string;
  isLateArrival: boolean;
  impactDescription?: string;
  size?: number;
}

export interface JumpFactor {
  type: 'threshold' | 'unit' | 'attachment';
  factorName: string;
  beforeValue: string;
  afterValue: string;
  impactDegree: number;
  description: string;
}

export interface ManualConfirmReason {
  reason: string;
  nextStep: string;
  requiredAction?: string;
}

export interface FieldMapping {
  oldFieldName: string;
  newFieldName: string;
  mappedAt: string;
  mapper: string;
}

export interface UnitCheckResult {
  passed: boolean;
  missingUnits: string[];
  unitMismatch: {
    formulaUnit: string;
    answerUnit: string;
    suggestion: string;
  } | null;
  conversionHint?: string;
}

export interface MistakeRecord {
  id: string;
  queueNumber: number;
  title: string;
  subject: string;
  chapter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: ProcessStatus;
  dataSource: DataSource;
  
  questionContent: string;
  formula: string;
  formulaUnit?: string;
  
  studentAnswer?: UnitInfo;
  correctAnswer?: UnitInfo;
  referenceAnswer?: UnitInfo;
  
  unitCheck: UnitCheckResult;
  
  attachments: Attachment[];
  lateAttachmentImpact?: string;
  
  jumpAnalysis?: {
    hasJump: boolean;
    jumpFactors: JumpFactor[];
    summary: string;
  };
  
  manualConfirm?: ManualConfirmReason;
  
  reviewNotes?: string;
  reviewer?: string;
  
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  
  fieldMappingNotes?: FieldMapping[];
  
  tags?: string[];
}

export type SortField = 'queueNumber' | 'createdAt' | 'status' | 'difficulty';
export type SortOrder = 'asc' | 'desc';

export interface FilterOptions {
  status?: ProcessStatus[];
  dataSource?: DataSource[];
  difficulty?: string[];
  hasUnitIssue?: boolean;
  hasLateAttachment?: boolean;
  keyword?: string;
}
