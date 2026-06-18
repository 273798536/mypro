import type { RecordStatus, AnomalyType, Severity, ChangeType } from '../../shared/types';

export const statusConfig: Record<
  RecordStatus,
  { label: string; className: string; bgColor: string; textColor: string }
> = {
  AVAILABLE: {
    label: '可用',
    className: 'bg-green-100 text-green-800 border-green-200',
    bgColor: '#10B981',
    textColor: '#065F46',
  },
  PENDING_REVIEW: {
    label: '待复核',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    bgColor: '#F59E0B',
    textColor: '#92400E',
  },
  UNAVAILABLE: {
    label: '不可用',
    className: 'bg-red-100 text-red-800 border-red-200',
    bgColor: '#EF4444',
    textColor: '#991B1B',
  },
};

export const anomalyTypeConfig: Record<
  AnomalyType,
  { label: string; className: string; icon: string }
> = {
  NULL_VALUE: {
    label: '空值问题',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: 'CircleSlash',
  },
  DUPLICATE: {
    label: '重复记录',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: 'Copy',
  },
  MIXED_NOTES: {
    label: '备注混写',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: 'FileWarning',
  },
  BACKUP_GAP: {
    label: '备份缺口',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: 'DatabaseZap',
  },
  OTHER: {
    label: '其他问题',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: 'AlertTriangle',
  },
};

export const severityConfig: Record<
  Severity,
  { label: string; className: string; dotColor: string }
> = {
  LOW: {
    label: '低',
    className: 'text-gray-600',
    dotColor: '#6B7280',
  },
  MEDIUM: {
    label: '中',
    className: 'text-amber-600',
    dotColor: '#F59E0B',
  },
  HIGH: {
    label: '高',
    className: 'text-red-600',
    dotColor: '#EF4444',
  },
};

export const changeTypeConfig: Record<
  ChangeType,
  { label: string; className: string; icon: string }
> = {
  ADD: {
    label: '新增',
    className: 'text-green-600 bg-green-50',
    icon: 'Plus',
  },
  MODIFY: {
    label: '修改',
    className: 'text-blue-600 bg-blue-50',
    icon: 'Edit3',
  },
  DELETE: {
    label: '删除',
    className: 'text-red-600 bg-red-50',
    icon: 'Trash2',
  },
  RENAME: {
    label: '重命名',
    className: 'text-purple-600 bg-purple-50',
    icon: 'PenLine',
  },
};

export const roleConfig: Record<
  string,
  { label: string; className: string; color: string }
> = {
  admin: {
    label: '管理员',
    className: 'bg-red-100 text-red-800',
    color: '#EF4444',
  },
  bi_analyst: {
    label: 'BI分析师',
    className: 'bg-blue-100 text-blue-800',
    color: '#3B82F6',
  },
  dev: {
    label: '研发团队',
    className: 'bg-green-100 text-green-800',
    color: '#10B981',
  },
};

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateText(text: string, maxLength: number = 30): string {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getStatusBadge(status: RecordStatus) {
  return statusConfig[status] || statusConfig.PENDING_REVIEW;
}

export function getAnomalyBadge(type: AnomalyType) {
  return anomalyTypeConfig[type] || anomalyTypeConfig.OTHER;
}

export function getChangeTypeBadge(type: ChangeType) {
  return changeTypeConfig[type] || changeTypeConfig.MODIFY;
}
