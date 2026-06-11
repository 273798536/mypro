/**
 * 投喂记录接口
 * 描述一次鱼类投喂实验的基本信息
 */
export interface FeedingRecord {
  /** 投喂记录唯一标识 */
  id: string;
  /** 投喂日期 */
  date: string;
  /** 执行投喂的研究人员姓名 */
  researcher: string;
  /** 实验组编号 */
  group_id: string;
  /** 投喂备注信息 */
  notes: string;
  /** 记录创建时间 */
  created_at: string;
  /** 记录最后更新时间 */
  updated_at: string;
}

/**
 * 样本接口
 * 描述单个实验样本的基本信息
 */
export interface Sample {
  /** 样本唯一标识 */
  id: string;
  /** 所属投喂记录ID */
  feeding_record_id: string;
  /** 输入的物种名称 */
  species_name: string;
  /** 标准化后的物种名称 */
  standard_species_name: string;
  /** 实验组编号 */
  group: string;
  /** 样本图片URL */
  image_url: string;
  /** 当前使用的样本版本ID */
  current_version_id: string | null;
  /** 样本创建时间 */
  created_at: string;
  /** 样本最后更新时间 */
  updated_at: string;
}

/**
 * 样本版本状态类型
 */
export type SampleVersionStatus = 'draft' | 'ai_reviewed' | 'human_corrected' | 'final';

/**
 * 样本版本接口
 * 跟踪样本在不同处理阶段的版本信息
 */
export interface SampleVersion {
  /** 版本唯一标识 */
  id: string;
  /** 所属样本ID */
  sample_id: string;
  /** 版本号（从1开始递增） */
  version_number: number;
  /** 所属工作流运行ID */
  run_id: string;
  /** 版本状态 */
  status: SampleVersionStatus;
  /** 版本创建时间 */
  created_at: string;
  /** 创建该版本的用户 */
  created_by: string;
}

/**
 * 图片标注接口
 * 描述AI或人工在图片上添加的标注框信息
 */
export interface ImageAnnotation {
  /** 标注唯一标识 */
  id: string;
  /** 所属样本版本ID */
  version_id: string;
  /** 标注框左上角X坐标（像素） */
  x: number;
  /** 标注框左上角Y坐标（像素） */
  y: number;
  /** 标注框宽度（像素） */
  width: number;
  /** 标注框高度（像素） */
  height: number;
  /** 标注标签（如病灶类型） */
  label: string;
  /** 置信度（0-1之间） */
  confidence: number;
  /** 标注来源：AI自动或人工标注 */
  source: 'ai' | 'human';
  /** 标注创建时间 */
  created_at: string;
}

/**
 * 病理备注接口
 * 用于记录对特定标注或整个版本的病理学描述
 */
export interface PathologyNote {
  /** 备注唯一标识 */
  id: string;
  /** 所属样本版本ID */
  version_id: string;
  /** 备注内容 */
  content: string;
  /** 关联的标注ID（可选，空表示版本级备注） */
  annotation_id: string | null;
  /** 备注创建时间 */
  created_at: string;
  /** 创建该备注的用户 */
  created_by: string;
}

/**
 * 修正日志接口
 * 记录人工对AI处理结果的修正历史
 */
export interface CorrectionLog {
  /** 修正日志唯一标识 */
  id: string;
  /** 所属样本版本ID */
  version_id: string;
  /** 被修正的字段名称 */
  field_name: string;
  /** 修正前的值 */
  old_value: string;
  /** 修正后的值 */
  new_value: string;
  /** 修正原因说明 */
  reason: string;
  /** 修正时间 */
  created_at: string;
  /** 执行修正的用户 */
  created_by: string;
}

/**
 * 工作流运行状态类型
 */
export type WorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * 工作流运行接口
 * 记录一次完整的AI处理工作流运行信息
 */
export interface WorkflowRun {
  /** 运行唯一标识 */
  id: string;
  /** 版本标签（如 v2025.06.11-r3） */
  version_label: string;
  /** 使用的AI模型版本 */
  model_version: string;
  /** 实验组过滤条件（可选，空表示处理所有组） */
  group_filter: string | null;
  /** 运行状态 */
  status: WorkflowRunStatus;
  /** 开始时间 */
  started_at: string;
  /** 完成时间 */
  completed_at: string | null;
  /** 触发该运行的用户 */
  created_by: string;
}

/**
 * 异常类型
 */
export type AnomalyType = 'missing_material' | 'incorrect_spec' | 'species_synonym' | 'annotation_low_conflict' | 'other';

/**
 * 异常严重程度
 */
export type AnomalySeverity = 'low' | 'medium' | 'high';

/**
 * 下一步操作建议
 */
export type NextAction = 'supply_material' | 'adjust_standard' | 'manual_review';

/**
 * 异常接口
 * 描述在数据处理过程中检测到的异常情况
 */
export interface Anomaly {
  /** 异常唯一标识 */
  id: string;
  /** 所属工作流运行ID */
  run_id: string;
  /** 关联的样本ID */
  sample_id: string;
  /** 异常类型 */
  type: AnomalyType;
  /** 异常严重程度 */
  severity: AnomalySeverity;
  /** 异常描述 */
  description: string;
  /** 建议的下一步操作 */
  next_action: NextAction;
  /** 是否已解决 */
  resolved: boolean;
  /** 解决时间（可选） */
  resolved_at: string | null;
}

/**
 * 物种名同义校验接口
 * 记录物种名称标准化的校验结果
 */
export interface SpeciesSynonymCheck {
  /** 校验记录唯一标识 */
  id: string;
  /** 所属工作流运行ID */
  run_id: string;
  /** 输入的原始物种名 */
  input_name: string;
  /** 匹配到的标准物种名 */
  standard_name: string;
  /** 该标准名对应的所有别名 */
  synonyms: string[];
  /** 使用的物种字典版本 */
  dictionary_version: string;
  /** 被阻止通过的原因（如存在歧义） */
  reason_blocked: string;
  /** 是否已人工确认解决 */
  resolved: boolean;
}

/**
 * 应用角色类型
 */
export type AppRole = 'researcher' | 'qc';

/**
 * 应用设置接口
 * 存储用户的全局偏好设置
 */
export interface AppSettings {
  /** 当前用户角色：研究人员或质控人员 */
  current_role: AppRole;
  /** 当前选中的工作流运行ID（可选） */
  selected_run_id: string | null;
}
