// 公交港湾站点状态枚举
export type BayStatus = 'normal' | 'abnormal' | 'pending';

// 变更操作人类型
export type ChangedBy = 'resident' | 'field' | 'planner';

// 坏数据标记枚举
export type BadDataFlag =
  | 'missing_name'
  | 'invalid_name'
  | 'missing_phone'
  | 'invalid_phone'
  | 'missing_content'
  | 'short_content'
  | 'no_matching_bay'
  | 'duplicate_content';

// 公交港湾站点数据模型
export interface BusBay {
  id: string;
  name: string;
  road: string;
  district: string;
  lng: number;
  lat: number;
  designCapacity: number;
  currentCapacity: number;
  status: BayStatus;
  feedbackCount: number;
  duplicateCount: number;
  badDataCount: number;
  createdAt: string;
  updatedAt: string;
}

// 居民反馈数据模型
export interface ResidentFeedback {
  id: string;
  bayId: string | null;
  sourceRow: number;
  sourceFile: string;
  residentName: string;
  phone: string;
  content: string;
  reportedAt: string;
  isDuplicate: boolean;
  duplicateOfId?: string;
  duplicateOrder?: number;
  badDataFlags: BadDataFlag[];
  rawData: Record<string, string | number | boolean | null | undefined>;
  importBatchId: string;
  createdAt: string;
}

// 版本历史记录数据模型
export interface VersionHistory {
  id: string;
  bayId: string;
  fieldName: string;
  oldValue: string | number | boolean | null | undefined | [number, number];
  newValue: string | number | boolean | null | undefined | [number, number];
  changedBy: ChangedBy;
  changedAt: string;
  remark: string;
  attachments: string[];
  sourceFeedbackId?: string;
  isFieldSupplement: boolean;
  changeSummary: string;
  oldLngLat?: [number, number];
  newLngLat?: [number, number];
}

// 筛选条件数据模型
export interface FilterCriteria {
  districts: string[];
  roads: string[];
  statuses: BayStatus[];
  hasDuplicate: boolean | null;
  hasBadData: boolean | null;
  dateFrom: string | null;
  dateTo: string | null;
  keyword: string;
}

// 导出统计数据模型
export interface ExportStatistics {
  total: number;
  abnormal: number;
  normal: number;
  pending: number;
  duplicates: number;
  badData: number;
}

// 导出批次数据模型
export interface ExportBatch {
  id: string;
  generatedAt: string;
  filterCriteria: FilterCriteria;
  statistics: ExportStatistics;
  snapshotHash: string;
  bayIdsSnapshot: string[];
  generatedBy: string;
  remark: string;
}

// 导入批次数据模型
export interface ImportBatch {
  id: string;
  fileName: string;
  importedAt: string;
  totalRows: number;
  validRows: number;
  badDataRows: number;
  duplicateRows: number;
  importedBy: string;
}

// 站点状态徽章配置类型
export interface StatusBadgeConfig {
  label: string;
  color: string;
  bgColor: string;
}

// 变更摘要结果类型
export interface ChangeSummaryResult {
  summary: string;
  fieldLabel: string;
}

// Mock 数据完整集合类型
export interface MockData {
  bays: BusBay[];
  feedbacks: ResidentFeedback[];
  versions: VersionHistory[];
  exportBatches: ExportBatch[];
  importBatches: ImportBatch[];
}
