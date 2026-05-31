import { MatchRecord } from '../types';
import { statusLabels, riskTypeLabels, batchStatusLabels } from '../data/mockData';

function formatAmount(amount: number): string {
  return (amount / 10000).toFixed(2) + '万';
}

export function exportToCSV(records: MatchRecord[], filename: string = '新能源补贴到账核对.csv') {
  const headers = [
    '记录编号',
    '项目名称',
    '批次号',
    '批次状态',
    '匹配状态',
    '应补贴金额',
    '到账金额',
    '到账日期',
    '风险类型',
    '确认人',
    '确认时间',
    '备注'
  ];

  const rows = records.map(record => {
    const riskTypes = record.risks.map(r => riskTypeLabels[r.riskType]).join('、');
    return [
      record.recordId,
      record.project.projectName,
      record.batch.batchNo,
      batchStatusLabels[record.batch.status],
      statusLabels[record.matchStatus],
      formatAmount(record.batch.subsidyAmount),
      formatAmount(record.payment.paymentAmount),
      record.payment.paymentDate,
      riskTypes || '无',
      record.confirmedBy || '',
      record.confirmedAt || '',
      record.notes || ''
    ];
  });

  const csvContent = [
    '\uFEFF' + headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
