import type { Sample } from '@/types';

function escapeCsv(value: string | number | boolean | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSamplesToCsv(samples: Sample[], filename = 'gatekeeper_samples.csv'): void {
  const headers = [
    '样本ID',
    '查询词',
    '真实标签',
    'Top10预测(docId:score)',
    '是否命中',
    '相似度分数',
    '是否验证集污染',
    '污染来源备注',
    '对指标贡献值',
    '延迟(ms)',
  ];

  const rows = samples.map((s) => [
    s.id,
    s.query,
    s.groundTruth,
    s.predictions.map((p) => `${p.docId}:${p.score.toFixed(4)}`).join('|'),
    s.isHit ? '是' : '否',
    s.score.toFixed(4),
    s.isContaminated ? '是' : '否',
    s.contaminationSource ?? '',
    s.contributionToMetric.toFixed(4),
    s.latencyMs,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
