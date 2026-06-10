/**
 * 培养基批号追溯工具 - 全局TypeScript类型定义
 */

/* ============================================
 * 基础枚举类型
 * ============================================ */

/**
 * 用户角色类型
 */
export type UserRole = 'researcher' | 'reviewer';

/**
 * 数据导入来源类型
 */
export type ImportSource = 'excel' | 'csv' | 'manual';

/**
 * 版本状态
 */
export type VersionStatus = 'draft' | 'active' | 'archived' | 'rollback';

/**
 * 异常类型
 */
export type AnomalyType =
  | 'species_synonym_conflict'
  | 'data_inconsistency'
  | 'version_chain_break'
  | 'duplicate_import'
  | 'supplement_conflict'
  | 'manual_correction_needed'
  | 'ai_low_confidence';

/**
 * 异常处理状态
 */
export type AnomalyStatus = 'pending' | 'reviewing' | 'resolved' | 'rejected';

/**
 * 结论审核状态
 */
export type ConclusionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

/**
 * 修正原因类型
 */
export type CorrectionReason =
  | 'species_name_correction'
  | 'data_entry_error'
  | 'batch_info_update'
  | 'culture_condition_adjustment'
  | 'sampling_location_update'
  | 'other';

/**
 * 报告类型
 */
export type ReportType = 'batch_trace' | 'species_consistency' | 'full_audit';

/**
 * 报告导出格式
 */
export type ExportFormat = 'pdf' | 'excel';

/**
 * AI/ML工作流步骤
 */
export type WorkflowStep =
  | 'sample_import'
  | 'version_management'
  | 'group_metric'
  | 'ai_analysis'
  | 'manual_correction'
  | 'conclusion_generation';

/**
 * 分组维度类型
 */
export type GroupDimension =
  | 'batch_number'
  | 'sampling_location'
  | 'species'
  | 'culture_condition'
  | 'culture_medium';

/* ============================================
 * 基础接口 - 通用字段
 * ============================================ */

/**
 * 基础实体接口 - 所有数据记录的基础
 */
export interface BaseEntity {
  /** 唯一标识符 */
  id: string;
  /** 创建时间戳 (ISO 8601) */
  createdAt: string;
  /** 更新时间戳 (ISO 8601) */
  updatedAt: string;
  /** 创建人ID */
  createdBy: string;
  /** 最后更新人ID */
  updatedBy: string;
}

/**
 * 操作人信息
 */
export interface OperatorInfo {
  /** 用户ID */
  userId: string;
  /** 用户姓名 */
  userName: string;
  /** 用户角色 */
  userRole: UserRole;
  /** 操作时间戳 */
  timestamp: string;
}

/* ============================================
 * 样本记录相关类型
 * ============================================ */

/**
 * 培养条件
 */
export interface CultureCondition {
  /** 温度 (摄氏度) */
  temperature: number | null;
  /** 湿度 (%) */
  humidity: number | null;
  /** CO2浓度 (%) */
  co2Concentration: number | null;
  /** 培养时长 (小时) */
  incubationHours: number | null;
  /** 其他条件备注 */
  otherNotes?: string;
}

/**
 * 样本原始追溯信息 - 保留原始行号、图片名、来源备注
 */
export interface SampleTraceInfo {
  /** 原始Excel/CSV行号 */
  originalRowNumber: number | null;
  /** 关联图片文件名 */
  imageFileNames: string[];
  /** 来源备注 */
  sourceNotes: string | null;
  /** 原始导入批次ID */
  importBatchId: string | null;
  /** 原始Sheet名称 (Excel导入时) */
  sheetName: string | null;
}

/**
 * 样本测量指标值
 */
export interface SampleMetricValue {
  /** 指标键名 */
  metricKey: string;
  /** 指标值 */
  value: number | string | null;
  /** 单位 */
  unit?: string;
  /** 是否人工修正过 */
  isCorrected: boolean;
  /** 原始值 */
  originalValue?: number | string | null;
}

/**
 * 样本记录
 */
export interface SampleRecord extends BaseEntity {
  /** 培养基批号 */
  batchNumber: string;
  /** 物种名称 (用户输入的原始名称) */
  speciesName: string;
  /** 标准化物种名称 (AI匹配后) */
  normalizedSpeciesName: string | null;
  /** 物种ID (关联物种同义词表) */
  speciesId: string | null;
  /** 采样地点 */
  samplingLocation: string;
  /** 采样时间 */
  samplingTime: string | null;
  /** 培养条件 */
  cultureCondition: CultureCondition;
  /** 培养基类型 */
  cultureMedium: string | null;
  /** 样本编号 */
  sampleCode: string;
  /** 测量指标列表 */
  metrics: SampleMetricValue[];
  /** 原始追溯信息 */
  traceInfo: SampleTraceInfo;
  /** 当前版本号 */
  currentVersion: string;
  /** 版本历史ID列表 */
  versionHistoryIds: string[];
  /** 异常标记 */
  hasAnomaly: boolean;
  /** 关联异常ID列表 */
  anomalyIds: string[];
  /** 关联人工修正ID列表 */
  correctionIds: string[];
  /** 最终结论ID */
  conclusionId: string | null;
  /** 样本备注 */
  remarks: string | null;
  /** 所属分组ID列表 */
  groupIds: string[];
  /** 是否标记为删除 */
  isDeleted: boolean;
}

/**
 * 样本记录创建参数
 */
export interface SampleRecordCreateInput {
  batchNumber: string;
  speciesName: string;
  samplingLocation: string;
  samplingTime?: string | null;
  cultureCondition?: Partial<CultureCondition>;
  cultureMedium?: string | null;
  sampleCode: string;
  metrics?: Omit<SampleMetricValue, 'isCorrected'>[];
  traceInfo?: Partial<SampleTraceInfo>;
  remarks?: string | null;
  createdBy: string;
}

/**
 * 样本记录更新参数
 */
export interface SampleRecordUpdateInput {
  id: string;
  batchNumber?: string;
  speciesName?: string;
  samplingLocation?: string;
  samplingTime?: string | null;
  cultureCondition?: Partial<CultureCondition>;
  cultureMedium?: string | null;
  sampleCode?: string;
  metrics?: SampleMetricValue[];
  remarks?: string | null;
  updatedBy: string;
}

/* ============================================
 * 版本记录相关类型
 * ============================================ */

/**
 * 版本差异变更项
 */
export interface VersionChangeItem {
  /** 字段路径 (例如: "speciesName" 或 "cultureCondition.temperature") */
  fieldPath: string;
  /** 字段中文名/标签 */
  fieldLabel: string;
  /** 变更前值 (JSON序列化字符串) */
  oldValue: string | null;
  /** 变更后值 (JSON序列化字符串) */
  newValue: string | null;
  /** 变更类型 */
  changeType: 'added' | 'modified' | 'removed';
}

/**
 * 版本记录
 */
export interface VersionRecord extends BaseEntity {
  /** 关联样本ID */
  sampleId: string;
  /** 版本号 (语义化格式 v1.0.0) */
  versionNumber: string;
  /** 版本序号 (整数递增) */
  versionSequence: number;
  /** 版本状态 */
  status: VersionStatus;
  /** 版本标题/摘要 */
  title: string;
  /** 版本详细描述 */
  description: string | null;
  /** 变更来源 (manual / ai / import / rollback) */
  changeSource: 'manual' | 'ai' | 'import' | 'rollback' | 'correction';
  /** 变更项列表 */
  changes: VersionChangeItem[];
  /** 该版本的完整数据快照 (JSON序列化) */
  dataSnapshot: string;
  /** 操作人信息 */
  operator: OperatorInfo;
  /** 关联人工修正ID (如果因修正产生版本) */
  relatedCorrectionId: string | null;
  /** 回滚到的目标版本号 (如果是回滚操作) */
  rolledBackToVersion: string | null;
  /** 父版本号 */
  parentVersion: string | null;
  /** 审核通过时间 */
  approvedAt: string | null;
  /** 审核人 */
  approvedBy: string | null;
}

/**
 * 版本对比结果
 */
export interface VersionComparisonResult {
  /** 基础版本号 */
  baseVersion: string;
  /** 目标版本号 */
  targetVersion: string;
  /** 差异项列表 */
  differences: VersionChangeItem[];
  /** 变更统计 */
  stats: {
    totalChanges: number;
    addedCount: number;
    modifiedCount: number;
    removedCount: number;
  };
}

/* ============================================
 * 人工修正相关类型
 * ============================================ */

/**
 * 修正字段变更
 */
export interface CorrectionFieldChange {
  /** 字段路径 */
  fieldPath: string;
  /** 字段名 */
  fieldName: string;
  /** 修正前值 */
  beforeValue: unknown;
  /** 修正后值 */
  afterValue: unknown;
}

/**
 * 人工修正记录
 */
export interface ManualCorrection extends BaseEntity {
  /** 关联样本ID */
  sampleId: string;
  /** 关联版本ID */
  versionId: string | null;
  /** 修正原因类型 */
  reason: CorrectionReason;
  /** 修正原因详细说明 */
  reasonDescription: string;
  /** 字段变更列表 */
  fieldChanges: CorrectionFieldChange[];
  /** 操作人信息 */
  operator: OperatorInfo;
  /** 是否触发重新分析 */
  triggeredReanalysis: boolean;
  /** 重新分析时间 */
  reanalysisAt: string | null;
  /** 关联分析结果ID */
  reanalysisResultId: string | null;
  /** 修正状态 (已应用/待审核/已驳回) */
  status: 'applied' | 'pending' | 'rejected';
  /** 审核人信息 (如果需要审核) */
  reviewer: OperatorInfo | null;
  /** 审核意见 */
  reviewComment: string | null;
  /** 审核时间 */
  reviewedAt: string | null;
  /** 关联结论ID (修正后产生的新结论) */
  resultingConclusionId: string | null;
  /** 附件/证明材料 */
  attachments: string[];
}

/**
 * 人工修正创建参数
 */
export interface ManualCorrectionCreateInput {
  sampleId: string;
  reason: CorrectionReason;
  reasonDescription: string;
  fieldChanges: CorrectionFieldChange[];
  operator: OperatorInfo;
  triggeredReanalysis?: boolean;
  attachments?: string[];
}

/* ============================================
 * 结论记录相关类型
 * ============================================ */

/**
 * 结论置信度维度
 */
export interface ConfidenceDimension {
  /** 维度名称 (如: 物种匹配、数据完整性等) */
  dimension: string;
  /** 置信度分数 (0-100) */
  score: number;
  /** 说明 */
  explanation: string;
}

/**
 * 结论关联证据
 */
export interface ConclusionEvidence {
  /** 证据类型 */
  type: 'sample_data' | 'ai_analysis' | 'manual_correction' | 'version_record' | 'external_reference';
  /** 关联ID */
  referenceId: string;
  /** 证据描述 */
  description: string;
}

/**
 * 结论记录
 */
export interface ConclusionRecord extends BaseEntity {
  /** 关联样本ID列表 (支持跨样本结论) */
  sampleIds: string[];
  /** 关联版本ID列表 */
  versionIds: string[];
  /** 关联人工修正ID列表 */
  correctionIds: string[];
  /** 结论标题 */
  title: string;
  /** 结论详细内容 */
  content: string;
  /** 结论摘要 (用于列表展示) */
  summary: string;
  /** 结论类型 */
  conclusionType: 'batch_consistency' | 'species_verification' | 'anomaly_resolution' | 'general';
  /** 整体置信度分数 (0-100) */
  confidenceScore: number;
  /** 各维度置信度 */
  confidenceDimensions: ConfidenceDimension[];
  /** 审核状态 */
  status: ConclusionStatus;
  /** 提交审核时间 */
  submittedAt: string | null;
  /** 提交人 */
  submittedBy: string | null;
  /** 审核人信息 */
  reviewer: OperatorInfo | null;
  /** 审核意见 */
  reviewComment: string | null;
  /** 审核时间 */
  reviewedAt: string | null;
  /** 关联证据链 */
  evidenceChain: ConclusionEvidence[];
  /** 关联异常ID列表 */
  resolvedAnomalyIds: string[];
  /** 是否被后续结论取代 */
  isSuperseded: boolean;
  /** 取代此结论的新结论ID */
  supersededBy: string | null;
  /** 标签 */
  tags: string[];
}

/**
 * 追溯链路节点 - 用于数据追溯视图
 */
export interface TraceChainNode {
  /** 节点ID */
  nodeId: string;
  /** 节点类型 */
  nodeType: 'sample' | 'version' | 'correction' | 'conclusion' | 'anomaly';
  /** 节点标题 */
  title: string;
  /** 节点描述 */
  description: string;
  /** 发生时间 */
  timestamp: string;
  /** 操作人 */
  operator: string;
  /** 前序节点ID列表 */
  previousNodeIds: string[];
  /** 后续节点ID列表 */
  nextNodeIds: string[];
  /** 额外数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 完整追溯链
 */
export interface FullTraceChain {
  /** 根样本ID */
  rootSampleId: string;
  /** 所有节点 */
  nodes: TraceChainNode[];
  /** 节点连接关系 */
  edges: Array<{ from: string; to: string; label?: string }>;
}

/* ============================================
 * 异常记录相关类型
 * ============================================ */

/**
 * 异常冲突详情 - 物种同义冲突等
 */
export interface AnomalyConflictDetail {
  /** 冲突类型说明 */
  conflictDescription: string;
  /** 冲突的样本ID列表 */
  conflictingSampleIds: string[];
  /** 冲突字段 */
  conflictingField: string | null;
  /** 冲突值对比 */
  conflictingValues: Array<{ sampleId: string; value: unknown }>;
  /** AI建议的解决方案 */
  suggestedResolution: string | null;
  /** 建议置信度 */
  suggestionConfidence: number | null;
}

/**
 * 异常记录
 */
export interface AnomalyRecord extends BaseEntity {
  /** 异常类型 */
  anomalyType: AnomalyType;
  /** 异常标题 */
  title: string;
  /** 异常详细描述 */
  description: string;
  /** 关联样本ID列表 */
  sampleIds: string[];
  /** 关联采样地点列表 (用于快速跳转) */
  relatedSamplingLocations: string[];
  /** 关联结论ID列表 */
  relatedConclusionIds: string[];
  /** 优先级 (1-高, 2-中, 3-低) */
  priority: 1 | 2 | 3;
  /** 处理状态 */
  status: AnomalyStatus;
  /** 冲突详情 (如果是冲突类异常) */
  conflictDetail: AnomalyConflictDetail | null;
  /** AI分析备注 */
  aiAnalysisNotes: string | null;
  /** 首次发现时间 */
  detectedAt: string;
  /** 发现来源 (ai / manual / import) */
  detectedBy: 'ai' | 'manual' | 'import' | 'system';
  /** 指派人ID */
  assigneeId: string | null;
  /** 处理记录 */
  handlingHistory: Array<{
    handler: OperatorInfo;
    action: string;
    comment: string | null;
    timestamp: string;
  }>;
  /** 处理结果说明 */
  resolution: string | null;
  /** 处理完成时间 */
  resolvedAt: string | null;
  /** 处理人 */
  resolvedBy: string | null;
  /** 关联物种同义词ID列表 (如果是同义冲突) */
  relatedSynonymIds: string[];
}

/**
 * 异常筛选条件
 */
export interface AnomalyFilter {
  anomalyTypes?: AnomalyType[];
  statuses?: AnomalyStatus[];
  priorities?: (1 | 2 | 3)[];
  dateRange?: { start: string; end: string } | null;
  assigneeId?: string | null;
  detectedBy?: ('ai' | 'manual' | 'import' | 'system')[];
  keyword?: string;
}

/* ============================================
 * 物种同义词相关类型
 * ============================================ */

/**
 * 别名记录
 */
export interface SynonymAlias {
  /** 别名 */
  alias: string;
  /** 来源 (latin / chinese / common / user_defined) */
  source: 'latin' | 'chinese' | 'common' | 'user_defined' | 'imported';
  /** 语言代码 */
  language: string;
  /** 添加时间 */
  addedAt: string;
  /** 是否人工确认过 */
  isVerified: boolean;
  /** 确认人ID */
  verifiedBy: string | null;
}

/**
 * 物种同义词记录
 */
export interface SpeciesSynonym extends BaseEntity {
  /** 标准/规范物种名 */
  canonicalName: string;
  /** 拉丁学名 */
  latinName: string | null;
  /** 中文学名 */
  chineseName: string | null;
  /** 分类学信息 */
  taxonomy: {
    kingdom?: string;
    phylum?: string;
    class?: string;
    order?: string;
    family?: string;
    genus?: string;
    species?: string;
  };
  /** 所有别名列表 */
  aliases: SynonymAlias[];
  /** 危险等级 (用于标记致病菌等) */
  hazardLevel: 'none' | 'low' | 'medium' | 'high' | null;
  /** 备注 */
  notes: string | null;
  /** 使用频率 (用于智能推荐排序) */
  usageCount: number;
  /** 是否为自定义新增 */
  isUserDefined: boolean;
  /** 关联样本ID列表 */
  relatedSampleIds: string[];
}

/**
 * 物种匹配结果
 */
export interface SpeciesMatchResult {
  /** 输入名称 */
  inputName: string;
  /** 匹配到的物种ID */
  matchedSpeciesId: string | null;
  /** 匹配到的规范名称 */
  matchedCanonicalName: string | null;
  /** 匹配分数 (0-100) */
  matchScore: number;
  /** 匹配方式 (exact / fuzzy / ai) */
  matchMethod: 'exact' | 'fuzzy' | 'ai' | 'none';
  /** 候选匹配列表 (用于人工选择) */
  candidates: Array<{
    speciesId: string;
    canonicalName: string;
    score: number;
    matchedAlias: string;
  }>;
  /** 是否需要人工确认 */
  needsManualReview: boolean;
  /** 未匹配原因 */
  unmatchReason: string | null;
}

/* ============================================
 * 分组指标配置相关类型
 * ============================================ */

/**
 * 单个指标定义
 */
export interface MetricDefinition {
  /** 指标唯一键 */
  key: string;
  /** 指标显示名称 */
  label: string;
  /** 指标描述 */
  description: string | null;
  /** 数值类型 */
  valueType: 'number' | 'string' | 'boolean' | 'date';
  /** 单位 (数值型时) */
  unit?: string;
  /** 允许的取值范围 (数值型) */
  valueRange?: { min: number; max: number } | null;
  /** 枚举可选值 (字符串枚举) */
  enumOptions?: string[] | null;
  /** 是否必填 */
  isRequired: boolean;
  /** 在分组统计中的权重 (0-100) */
  statisticWeight: number;
  /** 数据展示格式 */
  displayFormat?: 'number' | 'percentage' | 'currency' | 'date' | 'text';
  /** 小数位数 */
  decimalPlaces?: number;
}

/**
 * 分组统计结果
 */
export interface GroupStatisticResult {
  /** 分组键值 */
  groupKey: string;
  /** 分组显示名 */
  groupLabel: string;
  /** 样本数量 */
  sampleCount: number;
  /** 各指标统计值 */
  metricStats: Array<{
    metricKey: string;
    metricLabel: string;
    count: number;
    sum: number | null;
    avg: number | null;
    min: number | null;
    max: number | null;
    median: number | null;
    stdDev: number | null;
    unit?: string;
  }>;
  /** 子分组 (支持嵌套) */
  subGroups?: GroupStatisticResult[];
}

/**
 * 分组指标配置
 */
export interface GroupMetricConfig extends BaseEntity {
  /** 配置名称 */
  name: string;
  /** 配置描述 */
  description: string | null;
  /** 分组维度顺序 (支持多级分组) */
  groupDimensions: GroupDimension[];
  /** 自定义分组字段 (如果维度是custom) */
  customGroupFields?: Array<{ fieldPath: string; label: string }>;
  /** 包含的指标定义列表 */
  metrics: MetricDefinition[];
  /** 各指标权重设置 (必须总和为100) */
  metricWeights: Record<string, number>;
  /** 异常阈值配置 */
  anomalyThresholds: Record<string, {
    /** 偏差超过多少标准差视为异常 */
    stdDevThreshold?: number;
    /** 绝对值范围异常 */
    absoluteRange?: { min: number; max: number } | null;
    /** 是否启用此指标的异常检测 */
    enabled: boolean;
  }>;
  /** 是否为默认配置 */
  isDefault: boolean;
  /** 是否为系统预置 */
  isSystemPreset: boolean;
  /** 使用次数 */
  usageCount: number;
  /** 筛选条件 (应用于哪些样本) */
  sampleFilter?: {
    batchNumberPattern?: string | null;
    speciesIds?: string[] | null;
    dateRange?: { start: string; end: string } | null;
    samplingLocations?: string[] | null;
  } | null;
}

/**
 * 分组指标配置创建参数
 */
export interface GroupMetricConfigCreateInput {
  name: string;
  description?: string | null;
  groupDimensions: GroupDimension[];
  customGroupFields?: Array<{ fieldPath: string; label: string }>;
  metrics: MetricDefinition[];
  metricWeights: Record<string, number>;
  anomalyThresholds?: Record<string, {
    stdDevThreshold?: number;
    absoluteRange?: { min: number; max: number } | null;
    enabled: boolean;
  }>;
  sampleFilter?: GroupMetricConfig['sampleFilter'];
  createdBy: string;
}

/* ============================================
 * 报告相关类型
 * ============================================ */

/**
 * 报告生成配置
 */
export interface ReportGenerationConfig {
  /** 报告类型 */
  reportType: ReportType;
  /** 标题 */
  title: string;
  /** 批号范围筛选 */
  batchNumberRange?: { start?: string; end?: string } | null;
  /** 时间范围筛选 */
  dateRange?: { start: string; end: string } | null;
  /** 物种筛选 */
  speciesIds?: string[] | null;
  /** 采样地点筛选 */
  samplingLocations?: string[] | null;
  /** 样本ID列表 (如果要指定特定样本) */
  sampleIds?: string[] | null;
  /** 是否包含追溯链详情 */
  includeTraceChain: boolean;
  /** 是否包含版本变更日志 */
  includeVersionLog: boolean;
  /** 是否包含人工修正记录 */
  includeCorrections: boolean;
  /** 是否包含异常记录 */
  includeAnomalies: boolean;
  /** 是否包含统计图表 */
  includeCharts: boolean;
  /** 导出格式 */
  exportFormat: ExportFormat;
  /** 语言 */
  language: 'zh-CN' | 'en-US';
}

/**
 * 报告记录
 */
export interface ReportRecord extends BaseEntity {
  /** 报告名称 */
  name: string;
  /** 报告类型 */
  reportType: ReportType;
  /** 生成配置快照 */
  generationConfig: ReportGenerationConfig;
  /** 生成状态 */
  status: 'generating' | 'completed' | 'failed';
  /** 文件存储路径 */
  filePath: string | null;
  /** 文件大小 (字节) */
  fileSize: number | null;
  /** 包含的样本数量 */
  sampleCount: number;
  /** 包含的结论数量 */
  conclusionCount: number;
  /** 包含的异常数量 */
  anomalyCount: number;
  /** 生成耗时 (毫秒) */
  generationDuration: number | null;
  /** 错误信息 (生成失败时) */
  errorMessage: string | null;
  /** 操作人 */
  generatedBy: OperatorInfo;
}

/* ============================================
 * 工作台仪表盘相关类型
 * ============================================ */

/**
 * 仪表盘统计数据
 */
export interface DashboardStats {
  /** 总批次数 */
  totalBatchCount: number;
  /** 待复核异常数 */
  pendingAnomalyCount: number;
  /** 物种同义冲突数 */
  synonymConflictCount: number;
  /** 本月报告数 */
  monthlyReportCount: number;
  /** 总样本数 */
  totalSampleCount: number;
  /** 已审核通过结论数 */
  approvedConclusionCount: number;
  /** 待审核结论数 */
  pendingConclusionCount: number;
  /** 本月新增样本数 */
  monthlyNewSampleCount: number;
  /** 数据完整度百分比 */
  dataCompletenessRate: number;
  /** AI分析置信度平均值 */
  avgConfidenceScore: number;
}

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
  /** 日期标签 */
  dateLabel: string;
  /** 日期值 */
  date: string;
  /** 数值 */
  value: number;
}

/**
 * 月度复核进度
 */
export interface MonthlyReviewProgress {
  /** 月份 */
  month: string;
  /** 计划复核数 */
  plannedCount: number;
  /** 已完成数 */
  completedCount: number;
  /** 进行中数 */
  inProgressCount: number;
  /** 完成百分比 */
  completionRate: number;
}

/**
 * 快捷入口配置
 */
export interface QuickActionItem {
  /** 唯一键 */
  key: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 图标名称 (lucide-react) */
  iconName: string;
  /** 路由路径 */
  routePath: string;
  /** 是否高亮 (主要入口) */
  isHighlighted: boolean;
  /** 点击次数 (用于排序) */
  clickCount: number;
}

/* ============================================
 * 导入/导出相关类型
 * ============================================ */

/**
 * 导入列映射配置
 */
export interface ImportColumnMapping {
  /** 源列索引 (从0开始) */
  sourceColumnIndex: number;
  /** 源列名称 */
  sourceColumnName: string;
  /** 目标字段路径 */
  targetFieldPath: string;
  /** 目标字段显示名 */
  targetFieldLabel: string;
  /** 是否启用此映射 */
  enabled: boolean;
  /** 数据转换函数名 (可选) */
  transformFn?: string | null;
}

/**
 * 导入批次信息
 */
export interface ImportBatch {
  /** 批次ID */
  id: string;
  /** 导入来源 */
  source: ImportSource;
  /** 原始文件名 */
  originalFileName: string;
  /** 导入时间 */
  importedAt: string;
  /** 导入人 */
  importedBy: OperatorInfo;
  /** 总行数 */
  totalRows: number;
  /** 成功导入数 */
  successCount: number;
  /** 跳过行数 */
  skippedCount: number;
  /** 失败行数 */
  failedCount: number;
  /** Sheet名称列表 (Excel) */
  sheetNames?: string[];
  /** 错误详情 */
  errors: Array<{
    rowNumber: number;
    errorMessage: string;
    fieldName?: string;
  }>;
  /** 列映射配置 */
  columnMapping: ImportColumnMapping[];
}

/* ============================================
 * 用户/会话相关类型
 * ============================================ */

/**
 * 用户信息
 */
export interface UserInfo {
  /** 用户ID */
  id: string;
  /** 用户名/工号 */
  username: string;
  /** 显示姓名 */
  displayName: string;
  /** 角色 */
  role: UserRole;
  /** 所属部门 */
  department: string | null;
  /** 邮箱 */
  email: string | null;
  /** 头像URL */
  avatarUrl: string | null;
  /** 最后登录时间 */
  lastLoginAt: string | null;
  /** 偏好设置 */
  preferences: UserPreferences;
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  /** 主题 (light/dark) */
  theme: 'light' | 'dark';
  /** 语言 */
  language: 'zh-CN' | 'en-US';
  /** 每页显示条数 */
  pageSize: number;
  /** 是否显示新手引导 */
  showOnboarding: boolean;
  /** 工作台快捷入口顺序 */
  quickActionsOrder: string[];
  /** 默认分组指标配置ID */
  defaultMetricConfigId: string | null;
  /** 通知偏好 */
  notifications: {
    emailAnomaly: boolean;
    emailReview: boolean;
    inAppAnomaly: boolean;
    inAppReview: boolean;
  };
}

/**
 * 应用状态
 */
export interface AppState {
  /** 当前用户 */
  currentUser: UserInfo | null;
  /** 是否已完成首次启动引导 */
  onboardingCompleted: boolean;
  /** 当前主题 */
  theme: 'light' | 'dark';
  /** 当前语言 */
  language: 'zh-CN' | 'en-US';
  /** 当前活动工作流步骤 */
  activeWorkflowStep: WorkflowStep | null;
  /** 侧边栏展开状态 */
  sidebarExpanded: boolean;
}

/* ============================================
 * 通用工具类型
 * ============================================ */

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 排序参数
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * API响应包装
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errorCode?: string;
  timestamp: string;
}

/**
 * 可空类型
 */
export type Nullable<T> = T | null | undefined;

/**
 * 深度部分类型 (所有字段可选, 嵌套也可选)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * ID映射表 (字典)
 */
export type IDMap<T> = Record<string, T>;

/**
 * 通用状态类型 - 用于异步操作
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * 异步操作结果包装
 */
export interface AsyncState<T, E = string> {
  status: AsyncStatus;
  data: T | null;
  error: E | null;
}
