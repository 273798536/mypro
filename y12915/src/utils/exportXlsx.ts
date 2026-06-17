import * as XLSX from 'xlsx';
import type { EvaluationSample, ExportConfig, ModelVersion, SafetyRule } from '@/types';

export async function exportToXlsx(
  config: ExportConfig,
  samples: EvaluationSample[],
  versions: ModelVersion[],
  rules: SafetyRule[]
): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  const summary = [
    [config.title, ''],
    ['作者', config.author],
    ['导出时间', config.createdAt],
    ['版本ID', config.versionId],
    ['包含图表', config.includeCharts ? '是' : '否'],
    ['包含原始数据', config.includeRawData ? '是' : '否'],
    [],
    ['统计项', '数值'],
    ['总样本数', samples.length],
    ['版本数量', versions.length],
    ['安全规则数', rules.length],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  if (config.includeRawData) {
    const headers = [
      'ID',
      '行号',
      '源文件',
      '版本',
      '模型分数',
      '修正分',
      '修正理由',
      '状态',
      '置信度',
    ];
    const rows = samples.slice(0, 500).map((s) => [
      s.id,
      s.originalRowNumber ?? '',
      s.sourceFileName ?? '',
      s.modelVersionId ?? '',
      s.modelScore,
      s.humanCorrectedScore ?? '',
      s.correctionReason ?? '',
      s.reviewStatus,
      s.confidenceLevel,
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Samples');
  }

  const headers = ['ID', '规则名', '分类', '页面状态', '导出状态', '一致', '详情'];
  const rows = rules.map((r) => [
    r.id,
    r.name,
    r.category ?? '',
    r.pageStatus === undefined ? 'pending' : r.pageStatus ? 'pass' : 'fail',
    r.exportStatus === undefined ? 'pending' : r.exportStatus ? 'pass' : 'fail',
    r.isConsistent ? '是' : '否',
    r.detail ?? '',
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws3, 'SafetyRules');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/octet-stream' });
}
