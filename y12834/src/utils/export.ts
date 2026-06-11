import type {
  WorkflowRun,
  Anomaly,
  SpeciesSynonymCheck,
  Sample,
  SampleVersion,
  ImageAnnotation,
} from '../types';
import {
  anomalyTypeLabel,
  anomalySeverityLabel,
  nextActionLabel,
} from './anomaly';
import { DICTIONARY_VERSION } from './species';

/**
 * 生成带版本号和时间戳的报告文件名
 *
 * @param runId - 工作流运行ID
 * @param versionLabel - 版本标签，如 "v2025.06.11-r3"
 * @param type - 报告类型，如 "report"、"anomalies"、"csv" 等
 * @param ext - 文件扩展名，默认 "txt"
 * @returns 格式化的文件名，如 "run_v2025.06.11-r3_report_20250611_143022.txt"
 *
 * @example
 * ```ts
 * generateReportFileName("run_xxx", "v2025.06.11-r3", "report");
 * // "run_v2025.06.11-r3_report_20250611_143022.txt"
 * ```
 */
export function generateReportFileName(
  runId: string,
  versionLabel: string,
  type: string,
  ext: string = 'txt',
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const second = now.getSeconds().toString().padStart(2, '0');
  const timestamp = `${year}${month}${day}_${hour}${minute}${second}`;
  return `run_${versionLabel}_${type}_${timestamp}.${ext}`;
}

/**
 * 对CSV字段值进行转义
 * 处理包含逗号、双引号或换行符的情况
 *
 * @param value - 原始字段值
 * @returns 转义后的CSV字段值
 */
function escapeCSV(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 将数据导出为CSV格式
 * 数据可以是对象数组，自动使用对象的键作为表头
 *
 * @param data - 要导出的数据，对象数组形式
 * @param filename - 文件名（含扩展名）
 *
 * @example
 * ```ts
 * const data = [
 *   { name: "斑马鱼", count: 10 },
 *   { name: "青鳉鱼", count: 5 }
 * ];
 * exportToCSV(data, "samples.csv");
 * ```
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
): void {
  if (data.length === 0) {
    console.warn('[export] 数据为空，取消CSV导出');
    return;
  }

  const headers = Object.keys(data[0]);
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = data.map((row) =>
    headers.map((h) => escapeCSV(row[h])).join(','),
  );
  const csvContent = [headerRow, ...dataRows].join('\n');

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * 触发浏览器文件下载
 *
 * @param content - 文件内容
 * @param filename - 文件名
 * @param mimeType - MIME类型
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  try {
    const blob = new Blob([`\ufeff${content}`], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[export] 文件下载失败:', error);
  }
}

/**
 * 报告数据接口
 * 用于生成完整的文本报告
 */
export interface ReportData {
  /** 工作流运行信息 */
  run: WorkflowRun;
  /** 异常列表 */
  anomalies: Anomaly[];
  /** 物种名同义校验列表 */
  synonymChecks: SpeciesSynonymCheck[];
  /** 样本列表（可选） */
  samples?: Sample[];
  /** 样本版本列表（可选） */
  versions?: SampleVersion[];
  /** 图片标注列表（可选） */
  annotations?: ImageAnnotation[];
}

/**
 * 生成完整的文本报告
 * 包含：
 * - 报告头部信息（运行ID、版本、时间、状态）
 * - 异常统计摘要
 * - 各异常的详细解释和建议操作
 * - 物种名同义校验说明
 *
 * @param reportData - 报告所需的所有数据
 * @returns 格式化的文本报告内容
 */
export function generateReportText(reportData: ReportData): string {
  const { run, anomalies, synonymChecks, samples, versions, annotations } = reportData;

  const lines: string[] = [];
  const separator = '='.repeat(60);
  const subSeparator = '-'.repeat(60);

  lines.push(separator);
  lines.push('鱼类病理图像分析 - 工作流运行报告');
  lines.push(separator);
  lines.push('');

  lines.push('【基本信息】');
  lines.push(subSeparator);
  lines.push(`运行ID:         ${run.id}`);
  lines.push(`版本标签:       ${run.version_label}`);
  lines.push(`模型版本:       ${run.model_version}`);
  lines.push(`触发用户:       ${run.created_by}`);
  lines.push(`实验组过滤:     ${run.group_filter ?? '全部实验组'}`);
  lines.push(`开始时间:       ${run.started_at}`);
  lines.push(`完成时间:       ${run.completed_at ?? '运行中'}`);
  lines.push(`运行状态:       ${run.status}`);
  lines.push(`报告生成时间:   ${new Date().toISOString()}`);
  lines.push('');

  if (samples && samples.length > 0) {
    lines.push('【样本概览】');
    lines.push(subSeparator);
    lines.push(`样本总数:       ${samples.length}`);
    if (versions && versions.length > 0) {
      lines.push(`版本总数:       ${versions.length}`);
    }
    if (annotations && annotations.length > 0) {
      const aiAnnotations = annotations.filter((a) => a.source === 'ai').length;
      const humanAnnotations = annotations.filter((a) => a.source === 'human').length;
      lines.push(`标注总数:       ${annotations.length}`);
      lines.push(`  - AI标注:     ${aiAnnotations}`);
      lines.push(`  - 人工标注:   ${humanAnnotations}`);
    }

    const speciesCount: Record<string, number> = {};
    for (const sample of samples) {
      const key = sample.standard_species_name || sample.species_name;
      speciesCount[key] = (speciesCount[key] || 0) + 1;
    }
    lines.push('物种分布:');
    for (const [species, count] of Object.entries(speciesCount)) {
      lines.push(`  - ${species}: ${count} 条`);
    }
    lines.push('');
  }

  lines.push('【异常检测摘要】');
  lines.push(subSeparator);
  lines.push(`异常总数:       ${anomalies.length}`);

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };
  let resolved = 0;
  let unresolved = 0;

  for (const a of anomalies) {
    byType[a.type] = (byType[a.type] || 0) + 1;
    bySeverity[a.severity]++;
    if (a.resolved) resolved++;
    else unresolved++;
  }

  lines.push(`已解决:         ${resolved}`);
  lines.push(`待处理:         ${unresolved}`);
  lines.push('');

  lines.push('按严重程度分布:');
  lines.push(`  - 高(high):   ${bySeverity.high}`);
  lines.push(`  - 中(medium): ${bySeverity.medium}`);
  lines.push(`  - 低(low):    ${bySeverity.low}`);
  lines.push('');

  lines.push('按类型分布:');
  for (const [type, count] of Object.entries(byType)) {
    const label = anomalyTypeLabel[type as keyof typeof anomalyTypeLabel] || type;
    lines.push(`  - ${label}(${type}): ${count}`);
  }
  lines.push('');

  if (anomalies.length > 0) {
    lines.push('【异常详细列表】');
    lines.push(separator);
    lines.push('');

    for (let i = 0; i < anomalies.length; i++) {
      const anomaly = anomalies[i];
      lines.push(`异常 #${i + 1}`);
      lines.push(subSeparator);
      lines.push(`异常ID:         ${anomaly.id}`);
      lines.push(`关联样本ID:     ${anomaly.sample_id}`);
      lines.push(`异常类型:       ${anomalyTypeLabel[anomaly.type]} (${anomaly.type})`);
      lines.push(`严重程度:       ${anomalySeverityLabel[anomaly.severity]} (${anomaly.severity})`);
      lines.push(`处理状态:       ${anomaly.resolved ? '已解决' : '待处理'}`);
      if (anomaly.resolved_at) {
        lines.push(`解决时间:       ${anomaly.resolved_at}`);
      }
      lines.push(`详细描述:       ${anomaly.description}`);
      lines.push(`建议操作:       ${nextActionLabel[anomaly.next_action]} (${anomaly.next_action})`);
      lines.push('');
    }
  }

  lines.push('【物种名同义校验说明】');
  lines.push(separator);
  lines.push(`字典版本:       ${DICTIONARY_VERSION}`);
  lines.push(`校验记录数:     ${synonymChecks.length}`);
  lines.push('');

  const unresolvedSynonyms = synonymChecks.filter((s) => !s.resolved);
  const resolvedSynonyms = synonymChecks.filter((s) => s.resolved);

  lines.push(`已确认标准名:   ${resolvedSynonyms.length}`);
  lines.push(`待人工确认:     ${unresolvedSynonyms.length}`);
  lines.push('');

  if (synonymChecks.length > 0) {
    lines.push('校验详细列表:');
    lines.push(subSeparator);
    for (let i = 0; i < synonymChecks.length; i++) {
      const check = synonymChecks[i];
      lines.push(`  ${i + 1}. 输入: "${check.input_name}"`);
      lines.push(`     标准名: "${check.standard_name}"`);
      lines.push(`     别名: [${check.synonyms.join(', ')}]`);
      lines.push(`     状态: ${check.resolved ? '已确认' : '待确认'}`);
      if (check.reason_blocked) {
        lines.push(`     说明: ${check.reason_blocked}`);
      }
      lines.push('');
    }
  }

  lines.push(separator);
  lines.push('报告结束');
  lines.push(separator);

  return lines.join('\n');
}

/**
 * 导出文本报告
 * 生成完整的报告内容并触发浏览器下载
 *
 * @param reportData - 报告所需的所有数据
 * @param filename - 文件名
 *
 * @example
 * ```ts
 * exportReportAsText(reportData, "analysis_report.txt");
 * ```
 */
export function exportReportAsText(reportData: ReportData, filename: string): void {
  const content = generateReportText(reportData);
  downloadFile(content, filename, 'text/plain;charset=utf-8;');
}

/**
 * 导出异常数据为CSV
 *
 * @param anomalies - 异常列表
 * @param filename - 文件名
 */
export function exportAnomaliesToCSV(anomalies: Anomaly[], filename: string): void {
  const csvData = anomalies.map((a) => ({
    id: a.id,
    run_id: a.run_id,
    sample_id: a.sample_id,
    type: a.type,
    type_label: anomalyTypeLabel[a.type],
    severity: a.severity,
    severity_label: anomalySeverityLabel[a.severity],
    description: a.description,
    next_action: a.next_action,
    next_action_label: nextActionLabel[a.next_action],
    resolved: a.resolved ? '是' : '否',
    resolved_at: a.resolved_at ?? '',
  }));
  exportToCSV(csvData, filename);
}

/**
 * 导物种名同义校验数据为CSV
 *
 * @param checks - 同义校验记录列表
 * @param filename - 文件名
 */
export function exportSynonymChecksToCSV(
  checks: SpeciesSynonymCheck[],
  filename: string,
): void {
  const csvData = checks.map((c) => ({
    id: c.id,
    run_id: c.run_id,
    input_name: c.input_name,
    standard_name: c.standard_name,
    synonyms: c.synonyms.join('; '),
    dictionary_version: c.dictionary_version,
    reason_blocked: c.reason_blocked,
    resolved: c.resolved ? '是' : '否',
  }));
  exportToCSV(csvData, filename);
}
