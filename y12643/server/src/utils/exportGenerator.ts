import { ExceptionRecord, ProcessingRecord, ExportData, ExportSummary, FilterCriteria } from '../types';
import { generateExportSummary } from './dataConsistency';
import { getStatusLabel, getExceptionTypeLabel } from './colorRules';

export function exportToJSON(
  records: ExceptionRecord[],
  processingHistory: ProcessingRecord[],
  filters: FilterCriteria = {},
  exporter: string = '系统'
): string {
  const summary = generateExportSummary(records, processingHistory);

  const exportData: ExportData = {
    records,
    summary,
    processingHistory,
    metadata: {
      exportedAt: new Date().toISOString(),
      exporter,
      filters
    }
  };

  return JSON.stringify(exportData, null, 2);
}

export function exportToCSV(records: ExceptionRecord[]): string {
  const headers = [
    'ID',
    '异常类型',
    '记录类型',
    '标题',
    '状态',
    '状态说明',
    '来源文件',
    '导入时间',
    '导入人',
    '图层ID',
    '离线缺失',
    '重复导入',
    '描述',
    '创建时间',
    '更新时间'
  ];

  const recordTypeLabels: Record<string, string> = {
    trajectory: '轨迹记录',
    device_list: '设备清单',
    scale_error: '比例尺错用'
  };

  const rows = records.map(r => [
    r.id,
    getExceptionTypeLabel(r.type as any),
    recordTypeLabels[r.recordType] || r.recordType,
    r.title,
    r.status,
    getStatusLabel(r.status as any),
    r.source?.fileName || '',
    r.source?.importTime || '',
    r.source?.importer || '',
    r.layerId,
    r.offlineMissing ? '是' : '否',
    r.isDuplicate ? '是' : '否',
    (r.description || '').replace(/\n/g, ' '),
    r.createdAt,
    r.updatedAt
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        const cellStr = String(cell ?? '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export function exportProcessingHistoryToCSV(processingHistory: ProcessingRecord[]): string {
  const actionLabels: Record<string, string> = {
    confirm: '确认通过',
    modify: '修改数据',
    reject: '驳回重提',
    supplement: '补充素材',
    review: '复核'
  };

  const headers = [
    '处理记录ID',
    '异常记录ID',
    '处理动作',
    '操作人',
    '处理意见',
    '处理时间',
    '处理前状态',
    '处理后状态'
  ];

  const rows = processingHistory.map(p => [
    p.id,
    p.exceptionId,
    actionLabels[p.action] || p.action,
    p.operator,
    (p.opinion || '').replace(/\n/g, ' '),
    p.timestamp,
    getStatusLabel(p.previousStatus as any),
    getStatusLabel(p.newStatus as any)
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        const cellStr = String(cell ?? '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export function buildCSVBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
}

export function buildJSONBlob(jsonContent: string): Blob {
  return new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
}
