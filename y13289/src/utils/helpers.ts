import type { FilterCriteria } from '@shared/types';

export function getStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: '待处理', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    cleaned: { label: '已清洗', color: 'bg-green-100 text-green-700 border-green-300' },
    conflict: { label: '有冲突', color: 'bg-warning-100 text-warning-700 border-warning-300' },
    merged: { label: '已归并', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  };
  return map[status] || { label: status, color: 'bg-gray-100 text-gray-700 border-gray-300' };
}

export function getIssueTypeLabel(type: string): string {
  const map: Record<string, string> = {
    coordinate_offset: '坐标偏移',
    location_inconsistent: '地点不一致',
    name_inconsistent: '名称不一致',
    missing_data: '数据缺失',
    time_conflict: '时间冲突',
  };
  return map[type] || type;
}

export function getSeverityColor(severity: string): string {
  return severity === 'error'
    ? 'border-red-300 bg-red-50 text-red-700'
    : 'border-warning-300 bg-warning-50 text-warning-700';
}

export function getSourceLabel(source: string): string {
  return source === 'excel' ? 'Excel导入' : '手工录入';
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function generateFilterNote(filters: FilterCriteria, count: number): string {
  const parts: string[] = [];

  if (filters.status) {
    parts.push(`状态筛选：${getStatusLabel(filters.status).label}`);
  }
  if (filters.source) {
    parts.push(`来源筛选：${getSourceLabel(filters.source)}`);
  }
  if (filters.searchText) {
    parts.push(`关键词：${filters.searchText}`);
  }
  if (filters.goodsType) {
    parts.push(`货物类型：${filters.goodsType}`);
  }
  if (filters.dateFrom) {
    parts.push(`日期从：${filters.dateFrom}`);
  }
  if (filters.dateTo) {
    parts.push(`日期至：${filters.dateTo}`);
  }

  parts.push(`共 ${count} 条记录`);
  parts.push(`导出时间：${new Date().toLocaleString('zh-CN')}`);

  return parts.join('；');
}
