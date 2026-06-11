import type { WarningRecord } from '@/types';
import { STATUS_LABEL } from '@/types';

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportWarningsToCSV(warnings: WarningRecord[], filename = '票据池质押风险预警.csv') {
  const headers = [
    '票据号',
    '客户名称',
    '金额',
    '负数冲正',
    '状态',
    '风险类型',
    '风险等级',
    '预警日期',
    '确认日期',
    '操作人',
    '最新人工备注',
    '备注数',
    '截图数',
  ];

  const rows = warnings.map((w) => [
    w.billNo,
    w.customerName,
    w.amount.toFixed(2),
    w.isNegativeCorrection ? '是' : '否',
    STATUS_LABEL[w.status],
    w.riskType,
    w.riskLevel === 'high' ? '高' : w.riskLevel === 'medium' ? '中' : '低',
    w.createDate,
    w.confirmDate || '',
    w.operator || '',
    w.remarks.length > 0 ? w.remarks[w.remarks.length - 1].content : '',
    w.remarks.length,
    w.screenshots.length,
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
