import type { WarningType, WarningLevel, WarningStatus } from '../../shared/types';

export const typeLabels: Record<WarningType, string> = {
  quality_downgrade: '质检降级',
  duplicate_receipt: '重复仓单',
  price_gap: '价格缺口',
  normal: '正常'
};

export const typeColors: Record<WarningType, string> = {
  quality_downgrade: 'bg-red-100 text-red-700 border-red-200',
  duplicate_receipt: 'bg-orange-100 text-orange-700 border-orange-200',
  price_gap: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  normal: 'bg-green-100 text-green-700 border-green-200'
};

export const levelLabels: Record<WarningLevel, string> = {
  high: '高',
  medium: '中',
  low: '低'
};

export const levelColors: Record<WarningLevel, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500'
};

export const statusLabels: Record<WarningStatus, string> = {
  pending: '待复核',
  reviewing: '复核中',
  confirmed: '确认风险',
  dismissed: '排除风险',
  pending_info: '待补充材料'
};

export const statusColors: Record<WarningStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  reviewing: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-red-100 text-red-700',
  dismissed: 'bg-green-100 text-green-700',
  pending_info: 'bg-yellow-100 text-yellow-700'
};

export function formatMoney(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}万`;
  }
  return amount.toLocaleString('zh-CN');
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}
