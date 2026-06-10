export type SampleStatus = 'pending' | 'normal' | 'borderline' | 'contaminated';

export type ActionType = 'create' | 'review' | 'update_location' | 'manual_confirm' | 'rerun' | 'supplement';

export interface Sample {
  id: string;
  strainCode: string;
  strainName: string;
  preservationDate: string;
  expiryDate: string;
  samplingLocation: string;
  strainType: string;
  status: SampleStatus;
  autoJudge: SampleStatus;
  manualJudge?: SampleStatus;
  notes: string;
  batchNumber: string;
  createdAt: string;
  updatedAt: string;
  contaminationMarks?: string[];
}

export interface ReviewHistory {
  id: string;
  sampleId: string;
  reviewer: string;
  reviewDate: string;
  oldStatus: SampleStatus;
  newStatus: SampleStatus;
  opinion: string;
  reason: string;
}

export interface AuditLog {
  id: string;
  sampleId: string;
  operator: string;
  operateTime: string;
  action: ActionType;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export interface LocationChange {
  id: string;
  sampleId: string;
  oldLocation: string;
  newLocation: string;
  oldConclusion: SampleStatus;
  newConclusion: SampleStatus;
  operator: string;
  changeTime: string;
  reason: string;
  affectedStats: {
    oldGroupStats: Record<string, number>;
    newGroupStats: Record<string, number>;
  };
}

export interface StatSnapshot {
  id: string;
  batchNumber: string;
  snapshotTime: string;
  statsData: {
    byLocation: Record<string, Record<SampleStatus, number>>;
    byStrainType: Record<string, Record<SampleStatus, number>>;
    total: Record<SampleStatus, number>;
  };
  operator: string;
  runType: 'initial' | 'rerun' | 'supplement';
  previousSnapshotId?: string;
}

export const STATUS_LABELS: Record<SampleStatus, string> = {
  pending: '待复核',
  normal: '正常样本',
  borderline: '边界样本',
  contaminated: '污染样本',
};

export const STATUS_COLORS: Record<SampleStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-300',
  normal: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  borderline: 'bg-amber-50 text-amber-700 border-amber-300',
  contaminated: 'bg-rose-50 text-rose-700 border-rose-300',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  create: '创建样本',
  review: '复核操作',
  update_location: '修改采样地点',
  manual_confirm: '人工确认',
  rerun: '重复运行',
  supplement: '补录样本',
};

export const SAMPLING_LOCATIONS = [
  '动物房A区',
  '动物房B区',
  '动物房C区',
  'SPF区',
  '检疫区',
];

export const STRAIN_TYPES = [
  '细菌',
  '真菌',
  '病毒',
  '细胞株',
];

export const OPERATORS = [
  '张管理员',
  '李管理员',
  '王管理员',
  '赵质控员',
];
