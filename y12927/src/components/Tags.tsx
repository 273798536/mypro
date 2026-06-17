import type { AnomalyType, Severity, AnomalyStatus, LogStatus } from '../../shared/types';
import { ANOMALY_TYPE_LABEL, ANOMALY_TYPE_COLOR, SEVERITY_LABEL, STATUS_LABEL } from '../../shared/types';
import { cn } from '@/lib/utils';

export function AnomalyTypeTag({ type }: { type: AnomalyType }) {
  const color = ANOMALY_TYPE_COLOR[type];
  return (
    <span
      className="tag"
      style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      <span className="badge-dot" style={{ backgroundColor: color }} />
      {ANOMALY_TYPE_LABEL[type]}
    </span>
  );
}

export function SeverityTag({ severity }: { severity: Severity }) {
  const map: Record<Severity, { bg: string; color: string; label: string }> = {
    high: { bg: '#fee2e2', color: '#dc2626', label: SEVERITY_LABEL.high },
    medium: { bg: '#fef3c7', color: '#d97706', label: SEVERITY_LABEL.medium },
    low: { bg: '#dbeafe', color: '#2563eb', label: SEVERITY_LABEL.low },
  };
  const m = map[severity];
  return (
    <span className="tag" style={{ backgroundColor: m.bg, color: m.color }}>
      <span className="badge-dot" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  );
}

export function StatusTag({ status }: { status: AnomalyStatus }) {
  const map: Record<AnomalyStatus, { bg: string; color: string }> = {
    pending: { bg: '#fef3c7', color: '#b45309' },
    processing: { bg: '#dbeafe', color: '#1d4ed8' },
    resolved: { bg: '#d1fae5', color: '#047857' },
    ignored: { bg: '#e5e7eb', color: '#4b5563' },
  };
  const m = map[status];
  return (
    <span className="tag" style={{ backgroundColor: m.bg, color: m.color }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function LogStatusBadge({ status }: { status: LogStatus }) {
  const map: Record<LogStatus, { bg: string; color: string; label: string }> = {
    pass: { bg: '#d1fae5', color: '#047857', label: '通过' },
    warn: { bg: '#fef3c7', color: '#b45309', label: '警告' },
    fail: { bg: '#fee2e2', color: '#dc2626', label: '失败' },
  };
  const m = map[status];
  return (
    <span className={cn('tag', status === 'fail' && 'font-semibold')} style={{ backgroundColor: m.bg, color: m.color }}>
      <span className="badge-dot" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  );
}
