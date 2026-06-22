import type { CalculationBatch } from '../types';
import { formatDateTime, formatNumber } from './formatters';

export function exportBatchesToCsv(batches: CalculationBatch[]): {
  filename: string;
  content: string;
} {
  const headers = [
    '批次号',
    '板书版本',
    '符号体系',
    '处理人',
    '状态',
    '计算结果',
    '单位',
    '来源板书',
    '备注',
    '创建时间',
    '更新时间',
  ];

  const statusMap: Record<string, string> = {
    pending: '待复核',
    reviewing: '复核中',
    exception: '异常',
    done: '已完成',
  };

  const rows = batches.map((b) => [
    b.id,
    b.boardVersion,
    b.notationSystem,
    b.handler,
    statusMap[b.status] || b.status,
    formatNumber(b.resultValue),
    b.unit,
    b.sourceBoard,
    (b.note || '').replace(/\n/g, ' '),
    formatDateTime(b.createdAt),
    formatDateTime(b.updatedAt),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n');

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const filename = `抽样复核导出_${stamp}.csv`;

  return { filename, content: '\uFEFF' + csv };
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
