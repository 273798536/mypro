import type { DataStatus, RiskLevel } from '@/types';

export function RiskBadge({ level, size = 'md' }: { level: RiskLevel; size?: 'sm' | 'md' }) {
  const labels = { high: '高风险', medium: '中风险', low: '低风险' };
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  const colorClasses = {
    high: 'bg-risk-high/15 text-risk-high border-risk-high/30',
    medium: 'bg-risk-medium/15 text-risk-medium border-risk-medium/30',
    low: 'bg-risk-low/15 text-risk-low border-risk-low/30',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 border rounded ${sizeClass} ${colorClasses[level]}`}>
      <span className={`risk-dot risk-dot-${level}`} />
      {labels[level]}
    </span>
  );
}

export function DataStatusBadge({ status, size = 'md' }: { status: DataStatus; size?: 'sm' | 'md' }) {
  const labels = { available: '可用', pending: '暂缓', recollect: '重采' };
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  const colorClasses = {
    available: 'bg-data-status-available/15 text-data-status-available border-data-status-available/30',
    pending: 'bg-data-status-pending/15 text-data-status-pending border-data-status-pending/30',
    recollect: 'bg-data-status-recollect/15 text-data-status-recollect border-data-status-recollect/30',
  };

  const descriptions = {
    available: '数据可直接用于作业决策',
    pending: '需联系海洋老师确认后使用',
    recollect: '数据不可用，等待重新采集',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded ${sizeClass} ${colorClasses[status]}`}
      title={descriptions[status]}
    >
      {labels[status]}
    </span>
  );
}

export function ActionBadge({ action }: { action: 'supplement' | 'adjust' | 'normal' }) {
  const labels = { supplement: '补材料', adjust: '改口径', normal: '正常' };
  const colorClasses = {
    supplement: 'bg-risk-high/10 text-risk-high border-risk-high/20',
    adjust: 'bg-risk-medium/10 text-risk-medium border-risk-medium/20',
    normal: 'bg-risk-low/10 text-risk-low border-risk-low/20',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs border rounded ${colorClasses[action]}`}>
      下一步：{labels[action]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const labels = { high: '严重', medium: '中等', low: '轻微' };
  const colorClasses = {
    high: 'bg-risk-high/15 text-risk-high',
    medium: 'bg-risk-medium/15 text-risk-medium',
    low: 'bg-risk-low/15 text-risk-low',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded ${colorClasses[severity]}`}>
      {labels[severity]}
    </span>
  );
}
