import type {
  Sample,
  ImageAnnotation,
  Anomaly,
  AnomalyType,
  AnomalySeverity,
  NextAction,
} from '../types';
import { generateId } from './version';
import { checkSpeciesSynonym } from './species';

/**
 * 异常类型中文标签映射
 * 将英文异常类型转换为可读的中文描述
 */
export const anomalyTypeLabel: Record<AnomalyType, string> = {
  missing_material: '样本材料缺失',
  incorrect_spec: '规格不符合要求',
  species_synonym: '物种名同义问题',
  annotation_low_conflict: '标注置信度过低',
  other: '其他异常',
};

/**
 * 异常严重程度中文标签映射
 */
export const anomalySeverityLabel: Record<AnomalySeverity, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

/**
 * 下一步操作建议中文标签映射
 */
export const nextActionLabel: Record<NextAction, string> = {
  supply_material: '补充样本材料',
  adjust_standard: '调整规范标准',
  manual_review: '人工复核',
};

/**
 * 检测样本材料是否缺失
 * 判定条件：image_url 为空或无效
 *
 * @param sample - 待检测样本
 * @returns 异常对象（如果检测到），否则返回 null
 */
function detectMissingMaterial(sample: Sample, runId: string): Anomaly | null {
  if (!sample.image_url || sample.image_url.trim() === '') {
    return {
      id: generateId('anomaly'),
      run_id: runId,
      sample_id: sample.id,
      type: 'missing_material',
      severity: 'high',
      description: `样本 ${sample.id} 缺少图片数据，无法进行AI分析`,
      next_action: 'supply_material',
      resolved: false,
      resolved_at: null,
    };
  }
  return null;
}

/**
 * 检测样本规格是否符合要求
 * 判定条件：species_name 为空或格式异常
 *
 * @param sample - 待检测样本
 * @returns 异常对象（如果检测到），否则返回 null
 */
function detectIncorrectSpec(sample: Sample, runId: string): Anomaly | null {
  if (!sample.species_name || sample.species_name.trim().length < 2) {
    return {
      id: generateId('anomaly'),
      run_id: runId,
      sample_id: sample.id,
      type: 'incorrect_spec',
      severity: 'medium',
      description: `样本 ${sample.id} 的物种名称"${sample.species_name}"格式不符合规范要求`,
      next_action: 'adjust_standard',
      resolved: false,
      resolved_at: null,
    };
  }
  return null;
}

/**
 * 检测物种名同义问题
 * 判定条件：物种名是字典中的别名，需要标准化
 *
 * @param sample - 待检测样本
 * @returns 异常对象（如果检测到），否则返回 null
 */
function detectSpeciesSynonym(sample: Sample, runId: string): Anomaly | null {
  const check = checkSpeciesSynonym(sample.species_name, runId);
  if (check && !check.resolved) {
    return {
      id: generateId('anomaly'),
      run_id: runId,
      sample_id: sample.id,
      type: 'species_synonym',
      severity: 'low',
      description: `物种名称"${sample.species_name}"为"${check.standard_name}"的别名，建议使用标准名`,
      next_action: 'adjust_standard',
      resolved: false,
      resolved_at: null,
    };
  }
  return null;
}

/**
 * 检测标注置信度过低问题
 * 判定条件：存在 AI 标注的 confidence < 0.6
 *
 * @param annotations - 图片标注列表
 * @param sampleId - 样本ID
 * @returns 异常对象列表（如果检测到）
 */
function detectLowConfidenceAnnotations(
  annotations: ImageAnnotation[],
  sampleId: string,
  runId: string,
): Anomaly[] {
  const lowConfidence = annotations.filter(
    (ann) => ann.source === 'ai' && ann.confidence < 0.6,
  );

  if (lowConfidence.length === 0) {
    return [];
  }

  return [
    {
      id: generateId('anomaly'),
      run_id: runId,
      sample_id: sampleId,
      type: 'annotation_low_conflict',
      severity: lowConfidence.length >= 3 ? 'high' : 'medium',
      description: `样本 ${sampleId} 有 ${lowConfidence.length} 个AI标注置信度低于0.6，需要人工复核`,
      next_action: 'manual_review',
      resolved: false,
      resolved_at: null,
    },
  ];
}

/**
 * 模拟检测其他异常
 * 基于样本ID哈希确定性地生成少量"其他"类型异常，用于演示
 *
 * @param sample - 待检测样本
 * @returns 异常对象（如果触发），否则返回 null
 */
function detectOtherAnomaly(sample: Sample, runId: string): Anomaly | null {
  const hash = sample.id
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  if (hash % 13 === 0) {
    return {
      id: generateId('anomaly'),
      run_id: runId,
      sample_id: sample.id,
      type: 'other',
      severity: 'low',
      description: `样本 ${sample.id} 在预处理阶段检测到潜在的数据质量问题，建议人工确认`,
      next_action: 'manual_review',
      resolved: false,
      resolved_at: null,
    };
  }
  return null;
}

/**
 * 综合异常检测
 * 对所有样本和标注执行完整的异常检测流程
 *
 * 检测类型：
 * 1. missing_material - 样本材料缺失（无图片）
 * 2. incorrect_spec - 规格不符合要求
 * 3. species_synonym - 物种名同义问题
 * 4. annotation_low_conflict - AI标注置信度过低
 * 5. other - 其他模拟异常
 *
 * @param samples - 样本列表
 * @param annotations - 图片标注列表
 * @param runId - 工作流运行ID
 * @returns 检测到的所有异常数组
 */
export function detectAnomalies(
  samples: Sample[],
  annotations: ImageAnnotation[],
  runId: string,
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const sample of samples) {
    const sampleAnnotations = annotations.filter(
      (ann) => ann.version_id && sample.current_version_id,
    );

    const missing = detectMissingMaterial(sample, runId);
    if (missing) anomalies.push(missing);

    const incorrect = detectIncorrectSpec(sample, runId);
    if (incorrect) anomalies.push(incorrect);

    const synonym = detectSpeciesSynonym(sample, runId);
    if (synonym) anomalies.push(synonym);

    const lowConf = detectLowConfidenceAnnotations(
      sampleAnnotations,
      sample.id,
      runId,
    );
    anomalies.push(...lowConf);

    const other = detectOtherAnomaly(sample, runId);
    if (other) anomalies.push(other);
  }

  return anomalies;
}

/**
 * 按严重程度对异常进行排序
 * high > medium > low
 *
 * @param anomalies - 异常列表
 * @returns 排序后的异常列表
 */
export function sortAnomaliesBySeverity(anomalies: Anomaly[]): Anomaly[] {
  const severityOrder: Record<AnomalySeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return [...anomalies].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
}

/**
 * 按类型对异常进行分组
 *
 * @param anomalies - 异常列表
 * @returns 按类型分组的异常对象
 */
export function groupAnomaliesByType(
  anomalies: Anomaly[],
): Record<AnomalyType, Anomaly[]> {
  const result: Record<string, Anomaly[]> = {
    missing_material: [],
    incorrect_spec: [],
    species_synonym: [],
    annotation_low_conflict: [],
    other: [],
  };

  for (const anomaly of anomalies) {
    result[anomaly.type].push(anomaly);
  }

  return result;
}

/**
 * 获取异常统计摘要
 *
 * @param anomalies - 异常列表
 * @returns 各类异常数量统计
 */
export function getAnomalySummary(anomalies: Anomaly[]): {
  total: number;
  byType: Record<AnomalyType, number>;
  bySeverity: Record<AnomalySeverity, number>;
  resolved: number;
  unresolved: number;
} {
  const byType: Record<string, number> = {
    missing_material: 0,
    incorrect_spec: 0,
    species_synonym: 0,
    annotation_low_conflict: 0,
    other: 0,
  };
  const bySeverity: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  let resolved = 0;
  let unresolved = 0;

  for (const anomaly of anomalies) {
    byType[anomaly.type]++;
    bySeverity[anomaly.severity]++;
    if (anomaly.resolved) {
      resolved++;
    } else {
      unresolved++;
    }
  }

  return {
    total: anomalies.length,
    byType: byType as Record<AnomalyType, number>,
    bySeverity: bySeverity as Record<AnomalySeverity, number>,
    resolved,
    unresolved,
  };
}
