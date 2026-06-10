import type { Sample, AuditBatch } from '@/types';

const statusLabels: Record<string, string> = {
  normal: '正常',
  warning: '警告',
  contaminated: '污染',
  manually_confirmed: '人工确认',
  pending: '待处理',
};

const contaminationTypeLabels: Record<string, string> = {
  mycoplasma: '支原体污染',
  cross_sample: '交叉样本污染',
  reagent: '试剂污染',
  unknown: '未知污染',
};

export function exportToCSV(batch: AuditBatch, samples: Sample[]): string {
  const headers = [
    '样本ID',
    '样本名称',
    '来源材料',
    '采集时间',
    '物种',
    '标准物种名',
    '物种同义名问题',
    '蛋白浓度(μg/mL)',
    '纯度(%)',
    '完整性(%)',
    '背景噪声(dB)',
    '颗粒计数',
    '污染检测',
    '污染类型',
    '污染置信度',
    '疑似污染来源',
    '样本状态',
    '当前版本',
    '人工备注',
  ];

  const rows = samples.map(s => [
    s.id,
    s.name,
    s.sourceMaterial,
    new Date(s.collectedAt).toLocaleString('zh-CN'),
    s.species,
    s.speciesCanonical,
    s.hasSpeciesSynonymIssue ? '是' : '否',
    s.qualityMetrics.proteinConcentration,
    s.qualityMetrics.purity,
    s.qualityMetrics.integrity,
    s.qualityMetrics.backgroundNoise,
    s.qualityMetrics.particleCount,
    s.contamination.detected ? '是' : '否',
    s.contamination.detected ? contaminationTypeLabels[s.contamination.type] : '',
    (s.contamination.confidence * 100).toFixed(1) + '%',
    s.contamination.suspectedSource,
    statusLabels[s.status] || s.status,
    `v${s.currentVersion}`,
    s.manualNote || '',
  ]);

  const csvContent = [
    `批次信息：${batch.name}`,
    `创建时间：${new Date(batch.createdAt).toLocaleString('zh-CN')}`,
    `样本总数：${batch.sampleCount}`,
    `异常样本数：${batch.abnormalCount}`,
    `污染率：${batch.contaminationRate}%`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export function exportToJSON(batch: AuditBatch, samples: Sample[]): string {
  const data = {
    exportTime: new Date().toISOString(),
    batch: {
      id: batch.id,
      name: batch.name,
      createdAt: batch.createdAt,
      status: batch.status,
      sampleCount: batch.sampleCount,
      abnormalCount: batch.abnormalCount,
      contaminationRate: batch.contaminationRate,
      qcThresholds: batch.qcThresholds,
    },
    samples: samples.map(s => ({
      id: s.id,
      name: s.name,
      sourceMaterial: s.sourceMaterial,
      collectedAt: s.collectedAt,
      species: s.species,
      speciesCanonical: s.speciesCanonical,
      hasSpeciesSynonymIssue: s.hasSpeciesSynonymIssue,
      qualityMetrics: s.qualityMetrics,
      contamination: s.contamination,
      status: s.status,
      currentVersion: s.currentVersion,
      versionCount: s.versions.length,
      manualNote: s.manualNote,
    })),
  };

  return JSON.stringify(data, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
