import type { Point, CapacityCheckResult } from '@/types';
import { getNextSteps } from '@/data/mockData';

export function checkOverCapacity(point: Point): CapacityCheckResult {
  const exceedValue = point.capacity - point.limit;
  const exceedRatio = point.limit > 0 ? exceedValue / point.limit : 0;

  let severity: 'normal' | 'warning' | 'danger' = 'normal';
  if (exceedRatio > 0.2) {
    severity = 'danger';
  } else if (exceedRatio > 0) {
    severity = 'warning';
  }

  return {
    isOver: exceedValue > 0,
    exceedValue: Math.round(exceedValue * 100) / 100,
    exceedRatio: Math.round(exceedRatio * 10000) / 100,
    severity,
    nextSteps: getNextSteps(severity),
  };
}

export function formatCapacity(value: number): string {
  return `${value} kW`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'processed':
      return 'bg-status-success';
    case 'pending_field':
      return 'bg-status-warning';
    case 'conflict':
    case 'over_capacity':
      return 'bg-status-danger';
    default:
      return 'bg-gray-400';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'processed':
      return '已处理';
    case 'pending_field':
      return '待现场看';
    case 'conflict':
      return '冲突记录';
    case 'over_capacity':
      return '容量超限';
    default:
      return status;
  }
}

export function getSourceLabel(source: string): string {
  switch (source) {
    case 'site_survey':
      return '现场勘查';
    case 'design_institute':
      return '设计院';
    case 'power_company':
      return '供电所';
    case 'community_report':
      return '社区上报';
    default:
      return source;
  }
}

export function getSourceColorClass(source: string): string {
  switch (source) {
    case 'site_survey':
      return 'bg-blue-100 text-blue-700';
    case 'design_institute':
      return 'bg-purple-100 text-purple-700';
    case 'power_company':
      return 'bg-green-100 text-green-700';
    case 'community_report':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
