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
    ['含图片样本数', samples.filter((s) => !!s.imageName).length],
    ['含来源备注样本数', samples.filter((s) => !!s.sourceNote).length],
    ['人工修正样本数', samples.filter((s) => !!s.humanCorrectedScore).length],
    ['追溯完整率', `${((samples.filter((s) => !!s.originalRowNumber && !!s.sourceFileName).length / Math.max(samples.length, 1)) * 100).toFixed(2)}%`],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  if (config.includeRawData) {
    const headers = [
      'ID',
      '行号',
      '源文件',
      '批次ID',
      '数据源',
      '版本',
      '模型分数',
      '修正分',
      '分数差值',
      '修正理由',
      '修正人',
      '修正时间',
      '图片名',
      '图片链接',
      '图片类型',
      '来源备注',
      '状态',
      '置信度',
      '是否已修正',
    ];
    const rows = samples.slice(0, 500).map((s) => {
      const correctedScore = s.humanCorrectedScore ?? s.afterScore;
      const modelScore = s.modelScore;
      const diff = correctedScore !== undefined ? (correctedScore - modelScore).toFixed(2) : '';
      const isCorrected = correctedScore !== undefined || s.isCorrected === true;
      return [
        s.id,
        s.originalRowNumber ?? '',
        s.sourceFileName ?? '',
        s.batchId ?? '',
        s.dataSource ?? '',
        s.modelVersionId ?? '',
        modelScore,
        correctedScore ?? '',
        diff,
        s.correctionReason ?? '',
        s.correctedBy ?? '',
        s.correctedAt ?? '',
        s.imageName ?? '',
        s.imageUrl ?? '',
        s.imageType ?? '',
        s.sourceNote ?? '',
        s.reviewStatus ?? '',
        s.confidenceLevel ?? '',
        isCorrected ? '是' : '否',
      ];
    });
    const ws2 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws2['!cols'] = [
      { wch: 16 }, { wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 },
      { wch: 14 }, { wch: 20 }, { wch: 30 }, { wch: 50 }, { wch: 12 },
      { wch: 30 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Samples');
  }

  const headers = [
    'ID',
    '规则名',
    '分类',
    '页面状态',
    '导出文件状态',
    '是否一致',
    '最后校验时间',
    '阈值操作符',
    '阈值',
    '实际值',
    '详情说明',
  ];
  const rows = rules.map((r) => [
    r.id,
    r.name,
    r.category ?? '',
    r.pageStatus === undefined ? 'pending' : r.pageStatus ? 'pass' : 'fail',
    r.exportStatus === undefined ? 'pending' : r.exportStatus ? 'pass' : 'fail',
    r.isConsistent ? '是' : '否',
    r.lastCheckedAt ?? '',
    r.operator ?? '',
    r.threshold ?? '',
    r.actualValue ?? '',
    r.detail ?? '',
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws3['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 10 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'SafetyRules');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/octet-stream' });
}
