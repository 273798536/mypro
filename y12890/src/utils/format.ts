import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { DataStatus, RiskLevel, TaskStatus, DATA_STATUS_LABELS, NextStep, NEXT_STEP_LABELS } from '../types/common';

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm', { locale: zhCN });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy年MM月dd日', { locale: zhCN });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm', { locale: zhCN });
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

export function getStatusColor(status: DataStatus): string {
  return DATA_STATUS_LABELS[status]?.color || 'bg-gray-400';
}

export function getStatusLabel(status: DataStatus): string {
  return DATA_STATUS_LABELS[status]?.label || '未知';
}

export function getRiskLevelColor(level: RiskLevel): string {
  const colors = {
    [RiskLevel.LOW]: 'bg-tide-500',
    [RiskLevel.MEDIUM]: 'bg-status-pending',
    [RiskLevel.HIGH]: 'bg-status-review',
    [RiskLevel.CRITICAL]: 'bg-status-recollect',
  };
  return colors[level] || 'bg-gray-400';
}

export function getRiskLevelLabel(level: RiskLevel): string {
  const labels = {
    [RiskLevel.LOW]: '低风险',
    [RiskLevel.MEDIUM]: '中等风险',
    [RiskLevel.HIGH]: '高风险',
    [RiskLevel.CRITICAL]: '极高风险',
  };
  return labels[level] || '未知';
}

export function getTaskStatusLabel(status: TaskStatus): string {
  const labels = {
    [TaskStatus.UPLOADED]: '已上传',
    [TaskStatus.QUALITY_CHECKED]: '质量检测完成',
    [TaskStatus.TIDE_CALCULATED]: '潮汐计算完成',
    [TaskStatus.RISK_ASSESSED]: '风险评估完成',
    [TaskStatus.PENDING_REVIEW]: '待复核',
    [TaskStatus.REVIEWED]: '已复核',
    [TaskStatus.EXPORTED]: '已导出',
  };
  return labels[status] || '未知';
}

export function getTaskStatusColor(status: TaskStatus): string {
  const colors = {
    [TaskStatus.UPLOADED]: 'bg-ocean-500',
    [TaskStatus.QUALITY_CHECKED]: 'bg-ocean-600',
    [TaskStatus.TIDE_CALCULATED]: 'bg-tide-500',
    [TaskStatus.RISK_ASSESSED]: 'bg-tide-600',
    [TaskStatus.PENDING_REVIEW]: 'bg-status-pending',
    [TaskStatus.REVIEWED]: 'bg-status-available',
    [TaskStatus.EXPORTED]: 'bg-gray-500',
  };
  return colors[status] || 'bg-gray-400';
}

export function getNextStepLabel(step: NextStep): string {
  return NEXT_STEP_LABELS[step]?.label || '未知';
}

export function getNextStepDescription(step: NextStep): string {
  return NEXT_STEP_LABELS[step]?.description || '';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
