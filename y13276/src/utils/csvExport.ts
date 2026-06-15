import type { FirePoint, DataSource } from '@/types';
import { sourceTypeLabels, statusLabels } from '@/types';

export function exportToCSV(points: FirePoint[], sources: DataSource[]): string {
  const headers = [
    '点位编号',
    '点位名称',
    '位置',
    '经度',
    '纬度',
    '状态',
    '当前口径',
    '数据来源数量',
    '来源类型',
    '原始说法汇总',
    '备注',
  ];

  const rows = points.map((point) => {
    const pointSources = sources.filter((s) => s.pointId === point.id);
    const sourceTypes = [...new Set(pointSources.map((s) => sourceTypeLabels[s.type]))].join('、');
    const originalDescriptions = pointSources
      .map((s) => `[${sourceTypeLabels[s.type]}] ${s.description}（${s.recorder}，${s.recordTime}）`)
      .join(' | ');

    return [
      point.id,
      point.name,
      point.address,
      point.lng.toString(),
      point.lat.toString(),
      statusLabels[point.status],
      point.currentValue,
      pointSources.length.toString(),
      sourceTypes,
      originalDescriptions,
      point.remark,
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return '\uFEFF' + csvContent;
}

export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
