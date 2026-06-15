export enum DataStatus {
  AVAILABLE = 'available',
  PENDING = 'pending',
  NEED_REVIEW = 'need_review',
  RECOLLECT = 'recollect',
}

export enum NextStep {
  SUPPLEMENT_DATA = 'supplement',
  ADJUST_PARAMS = 'adjust',
  RECOLLECT = 'recollect',
  NO_ACTION = 'none',
}

export enum QualityIssueType {
  NULL_VALUE = 'null_value',
  DUPLICATE = 'duplicate',
  UNIT_MIXED = 'unit_mixed',
  TIMEZONE_ERROR = 'timezone_error',
  NOTE_MIXED = 'note_mixed',
  OUT_OF_RANGE = 'out_of_range',
}

export enum SalinityUnit {
  PSU = 'PSU',
  PPT = 'ppt',
  PERMILLE = '‰',
  MG_L = 'mg/L',
}

export enum TideUnit {
  METER = 'm',
  CENTIMETER = 'cm',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TaskStatus {
  UPLOADED = 'uploaded',
  QUALITY_CHECKED = 'quality_checked',
  TIDE_CALCULATED = 'tide_calculated',
  RISK_ASSESSED = 'risk_assessed',
  PENDING_REVIEW = 'pending_review',
  REVIEWED = 'reviewed',
  EXPORTED = 'exported',
}

export enum ReviewEntryType {
  RISK_ALERT = 'risk_alert',
  WATER_RECORD = 'water_record',
  DUPLICATE = 'duplicate',
}

export interface MonitoringPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  zone: string;
}

export interface QualityIssue {
  id: string;
  recordId: string;
  type: QualityIssueType;
  severity: DataStatus;
  description: string;
  suggestion: string;
  nextStep: NextStep;
}

export const DATA_STATUS_LABELS: Record<DataStatus, { label: string; color: string }> = {
  [DataStatus.AVAILABLE]: { label: '可用', color: 'bg-status-available' },
  [DataStatus.PENDING]: { label: '暂缓', color: 'bg-status-pending' },
  [DataStatus.NEED_REVIEW]: { label: '需复核', color: 'bg-status-review' },
  [DataStatus.RECOLLECT]: { label: '需重采', color: 'bg-status-recollect' },
};

export const NEXT_STEP_LABELS: Record<NextStep, { label: string; description: string }> = {
  [NextStep.SUPPLEMENT_DATA]: { label: '补材料', description: '需要补充缺失的数据或材料' },
  [NextStep.ADJUST_PARAMS]: { label: '改口径', description: '需要调整计算参数或统计口径' },
  [NextStep.RECOLLECT]: { label: '重新采集', description: '数据质量问题严重，需要重新采集' },
  [NextStep.NO_ACTION]: { label: '无需处理', description: '数据正常，无需额外操作' },
};

export const QUALITY_ISSUE_LABELS: Record<QualityIssueType, { label: string; defaultStatus: DataStatus; defaultNextStep: NextStep }> = {
  [QualityIssueType.NULL_VALUE]: {
    label: '空值',
    defaultStatus: DataStatus.PENDING,
    defaultNextStep: NextStep.SUPPLEMENT_DATA,
  },
  [QualityIssueType.DUPLICATE]: {
    label: '重复记录',
    defaultStatus: DataStatus.PENDING,
    defaultNextStep: NextStep.ADJUST_PARAMS,
  },
  [QualityIssueType.UNIT_MIXED]: {
    label: '单位混用',
    defaultStatus: DataStatus.NEED_REVIEW,
    defaultNextStep: NextStep.ADJUST_PARAMS,
  },
  [QualityIssueType.TIMEZONE_ERROR]: {
    label: '时区错误',
    defaultStatus: DataStatus.PENDING,
    defaultNextStep: NextStep.ADJUST_PARAMS,
  },
  [QualityIssueType.NOTE_MIXED]: {
    label: '备注混写',
    defaultStatus: DataStatus.NEED_REVIEW,
    defaultNextStep: NextStep.SUPPLEMENT_DATA,
  },
  [QualityIssueType.OUT_OF_RANGE]: {
    label: '超出合理范围',
    defaultStatus: DataStatus.RECOLLECT,
    defaultNextStep: NextStep.RECOLLECT,
  },
};

export const SALINITY_UNIT_FACTORS: Record<SalinityUnit, number> = {
  [SalinityUnit.PSU]: 1,
  [SalinityUnit.PPT]: 1,
  [SalinityUnit.PERMILLE]: 1,
  [SalinityUnit.MG_L]: 0.001,
};
