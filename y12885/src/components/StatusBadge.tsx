import { cn } from '../lib/utils';
import { DataQuality, Severity, WarningLevel, ReviewStatus } from '../types';

interface StatusBadgeProps {
  status: DataQuality | Severity | WarningLevel | ReviewStatus;
  type?: 'data-quality' | 'severity' | 'warning' | 'review';
  className?: string;
}

export function StatusBadge({ status, type = 'data-quality', className }: StatusBadgeProps) {
  const getStyles = () => {
    switch (type) {
      case 'data-quality':
        return getDataQualityStyles(status as DataQuality);
      case 'severity':
        return getSeverityStyles(status as Severity);
      case 'warning':
        return getWarningStyles(status as WarningLevel);
      case 'review':
        return getReviewStyles(status as ReviewStatus);
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'data-quality':
        return getDataQualityLabel(status as DataQuality);
      case 'severity':
        return getSeverityLabel(status as Severity);
      case 'warning':
        return getWarningLabel(status as WarningLevel);
      case 'review':
        return getReviewLabel(status as ReviewStatus);
      default:
        return status;
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border transition-colors',
        getStyles(),
        className
      )}
    >
      {getLabel()}
    </span>
  );
}

function getDataQualityStyles(status: DataQuality): string {
  const styles: Record<DataQuality, string> = {
    raw: 'bg-ocean-700/40 text-ocean-200 border-ocean-600/40',
    cleaned: 'bg-ocean-500/30 text-ocean-100 border-ocean-400/40',
    pending: 'bg-data-pending/20 text-data-pending border-data-pending/30',
    approved: 'bg-data-available/20 text-data-available border-data-available/30',
    rejected: 'bg-data-recollect/20 text-data-recollect border-data-recollect/30',
    suspended: 'bg-data-suspended/20 text-data-suspended border-data-suspended/30',
    recollect: 'bg-data-recollect/20 text-data-recollect border-data-recollect/30',
    available: 'bg-data-available/20 text-data-available border-data-available/30',
  };
  return styles[status];
}

function getDataQualityLabel(status: DataQuality): string {
  const labels: Record<DataQuality, string> = {
    raw: '原始数据',
    cleaned: '已清洗',
    pending: '待复核',
    approved: '已通过',
    rejected: '已驳回',
    suspended: '暂缓',
    recollect: '需重采',
    available: '可用',
  };
  return labels[status];
}

function getSeverityStyles(severity: Severity): string {
  const styles: Record<Severity, string> = {
    low: 'bg-ocean-600/30 text-ocean-200 border-ocean-500/30',
    medium: 'bg-data-suspended/20 text-data-suspended border-data-suspended/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-data-recollect/20 text-data-recollect border-data-recollect/30',
  };
  return styles[severity];
}

function getSeverityLabel(severity: Severity): string {
  const labels: Record<Severity, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  };
  return labels[severity];
}

function getWarningStyles(level: WarningLevel): string {
  const styles: Record<WarningLevel, string> = {
    warning: 'bg-data-suspended/20 text-data-suspended border-data-suspended/30',
    alert: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-data-recollect/20 text-data-recollect border-data-recollect/30',
  };
  return styles[level];
}

function getWarningLabel(level: WarningLevel): string {
  const labels: Record<WarningLevel, string> = {
    warning: '预警',
    alert: '告警',
    critical: '严重',
  };
  return labels[level];
}

function getReviewStyles(status: ReviewStatus): string {
  const styles: Record<ReviewStatus, string> = {
    pending: 'bg-data-pending/20 text-data-pending border-data-pending/30',
    approved: 'bg-data-available/20 text-data-available border-data-available/30',
    rejected: 'bg-data-recollect/20 text-data-recollect border-data-recollect/30',
  };
  return styles[status];
}

function getReviewLabel(status: ReviewStatus): string {
  const labels: Record<ReviewStatus, string> = {
    pending: '待处理',
    approved: '已通过',
    rejected: '已驳回',
  };
  return labels[status];
}
