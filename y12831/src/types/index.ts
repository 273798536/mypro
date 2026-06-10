export type QualityStatus = 'pass' | 'low_quality' | 'warning' | 'fail';

export type ReviewStatus = 'pending' | 'reviewing' | 'confirmed' | 'rejected';

export type BoundaryType = 'group_ambiguous' | 'negative_control_abnormal' | 'low_quality_edge' | 'timepoint_cross';

export type OperationType = 'import' | 'modify_group' | 'modify_quality' | 'add_note' | 'confirm' | 'reject' | 'revert';

export interface Sample {
  id: string;
  sampleId: string;
  batchId: string;
  groupName: string;
  q20: number;
  q30: number;
  totalReads: number;
  mappedReads: number;
  qualityStatus: QualityStatus;
  reviewStatus: ReviewStatus;
  currentReviewer: string;
  lastModified: Date;
  lastModifier: string;
  hasBoundary: boolean;
  finalGroup?: string;
}

export interface ReviewRecord {
  id: string;
  sampleId: string;
  operationType: OperationType;
  operator: string;
  operateTime: Date;
  reason: string;
  oldGroup?: string;
  newGroup?: string;
  oldStatus?: QualityStatus | ReviewStatus;
  newStatus?: QualityStatus | ReviewStatus;
  comment: string;
}

export interface BoundaryNote {
  id: string;
  sampleId: string;
  boundaryType: BoundaryType;
  explanation: string;
  creator: string;
  createTime: Date;
}

export interface MAPlotPoint {
  gene: string;
  log2FoldChange: number;
  baseMean: number;
  significant: boolean;
}

export interface VolcanoPoint {
  gene: string;
  log2FoldChange: number;
  negLog10Pvalue: number;
  significant: boolean;
  regulated: 'up' | 'down' | 'none';
}

export interface DiffAnalysis {
  id: string;
  sampleId: string;
  versionTag: 'before' | 'after';
  diffGeneCount: number;
  upRegulated: number;
  downRegulated: number;
  maPlotData: MAPlotPoint[];
  volcanoData: VolcanoPoint[];
  topPathway: string;
}

export interface HistoryVersion {
  id: string;
  sampleId: string;
  reviewRecordId: string;
  version: number;
  snapshotTime: Date;
  snapshotData: Sample;
}

export interface BatchInfo {
  batchId: string;
  batchName: string;
  totalSamples: number;
  pendingCount: number;
  confirmedCount: number;
  lastOperateTime: Date;
}

export interface User {
  id: string;
  name: string;
  role: 'investigator' | 'teacher' | 'engineer';
  employeeId: string;
}

export const qualityStatusLabels: Record<QualityStatus, string> = {
  pass: '质量合格',
  low_quality: '低质量',
  warning: '质量警告',
  fail: '质量不合格',
};

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  pending: '待复核',
  reviewing: '复核中',
  confirmed: '已确认',
  rejected: '已驳回',
};

export const boundaryTypeLabels: Record<BoundaryType, string> = {
  group_ambiguous: '分组边界不清',
  negative_control_abnormal: '阴性对照异常',
  low_quality_edge: '低质量边缘',
  timepoint_cross: '时间点交叉',
};

export const operationTypeLabels: Record<OperationType, string> = {
  import: '导入数据',
  modify_group: '修改分组',
  modify_quality: '修改质量状态',
  add_note: '添加备注',
  confirm: '确认通过',
  reject: '驳回',
  revert: '版本回退',
};

export const boundaryTypeTemplates: Record<BoundaryType, string> = {
  group_ambiguous: '该样本分组标注存在歧义，原始记录显示处理时间与对照组有重叠。经核对采样日志，实际处理时间符合处理组标准，建议归入处理组。此情况在同类生态调查中约占5-8%，主要由野外采样时条件复杂导致。',
  negative_control_abnormal: '阴性对照检出低丰度表达，检查同期测序数据发现为批次间交叉污染所致，非操作失误。污染水平低于阈值0.1%，不影响主要分析结论。建议保留该批次数据，同时在报告中注明。',
  low_quality_edge: 'Q20值略低于阈值（18.3% vs 20%），但该样本采自稀有生态位点，重复采样困难。结合GC含量分布和比对率分析，数据质量可满足分析要求。建议复核通过，并在后续分析中给予适当权重调整。',
  timepoint_cross: '处理时间点记录存在交叉，原始标注为0h但采样记录显示实际处理时间为8h。经与采样人员确认，为记录笔误。修正为处理组8h。',
};
