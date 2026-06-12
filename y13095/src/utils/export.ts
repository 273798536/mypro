import type { Point, PointStatus, HistoryRecord } from '@/types';
import { STATUS_LABELS } from '@/types';
import { formatDateTime } from './storage';

export interface ExportOptions {
  format: 'csv' | 'json';
  scope: 'all' | 'filtered' | 'abnormal';
  includeHistory?: boolean;
}

function convertToCSV(points: Point[], history?: HistoryRecord[]): string {
  const headers = [
    '点位ID',
    '点位名称',
    '经度',
    '纬度',
    '高度(m)',
    '坐标来源',
    '状态',
    '航线编号',
    '备注',
    '创建时间',
    '更新时间',
  ];

  const rows = points.map(p => [
    p.id,
    p.name,
    p.lng.toFixed(6),
    p.lat.toFixed(6),
    p.altitude.toFixed(1),
    p.source,
    STATUS_LABELS[p.status],
    p.corridorId,
    p.remark || '',
    formatDateTime(p.createdAt),
    formatDateTime(p.updatedAt),
  ]);

  let csv = '\uFEFF' + headers.join(',') + '\n';
  csv += rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');

  if (history && history.length > 0) {
    csv += '\n\n--- 历史记录 ---\n';
    const histHeaders = [
      '记录ID',
      '点位ID',
      '操作人',
      '操作类型',
      '旧值',
      '新值',
      '备注',
      '是否有关联截图',
      '时间',
    ];
    csv += histHeaders.join(',') + '\n';
    csv += history.map(h => [
      h.id,
      h.pointId,
      h.operator,
      h.actionType,
      h.oldValue || '',
      h.newValue || '',
      h.remark || '',
      h.screenshot ? '是' : '否',
      formatDateTime(h.timestamp),
    ].map(cell => `"${cell}"`).join(',')).join('\n');
  }

  return csv;
}

function convertToJSON(points: Point[], history?: HistoryRecord[]): string {
  const data: {
    points: Point[];
    exportTime: string;
    history?: HistoryRecord[];
  } = {
    points,
    exportTime: new Date().toISOString(),
  };
  
  if (history && history.length > 0) {
    data.history = history;
  }
  
  return JSON.stringify(data, null, 2);
}

export function exportData(
  points: Point[],
  options: ExportOptions,
  allHistory?: HistoryRecord[]
): void {
  let filteredPoints = points;
  
  if (options.scope === 'abnormal') {
    filteredPoints = points.filter(p => p.status === 'abnormal');
  }
  
  let history = allHistory;
  if (options.scope === 'abnormal') {
    const abnormalIds = new Set(filteredPoints.map(p => p.id));
    history = allHistory?.filter(h => abnormalIds.has(h.pointId));
  }
  
  let content: string;
  let mimeType: string;
  let extension: string;
  let fileName: string;
  
  if (options.format === 'csv') {
    content = convertToCSV(filteredPoints, options.includeHistory ? history : undefined);
    mimeType = 'text/csv;charset=utf-8';
    extension = 'csv';
  } else {
    content = convertToJSON(filteredPoints, options.includeHistory ? history : undefined);
    mimeType = 'application/json;charset=utf-8';
    extension = 'json';
  }
  
  const scopeLabel = options.scope === 'all' ? '全部' : options.scope === 'abnormal' ? '异常' : '筛选';
  fileName = `低空航线复核_${scopeLabel}_${new Date().toISOString().slice(0, 10)}.${extension}`;
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getStatusCounts(points: Point[]): Record<PointStatus, number> {
  return points.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<PointStatus, number>);
}
