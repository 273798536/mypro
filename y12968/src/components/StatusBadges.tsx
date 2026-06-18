import type { AnomalyType, Severity, RecordStatus } from '@/types/ledger';
import { ANOMALY_TYPE_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '@/types/ledger';

export function AnomalyBadge({ type }: { type: AnomalyType }) {
  const colorMap: Record<AnomalyType, string> = {
    backup_gap: 'bg-amber-100 text-amber-800 border-amber-300',
    slow_query: 'bg-blue-100 text-blue-800 border-blue-300',
    refresh_fail: 'bg-red-100 text-red-800 border-red-300',
    normal: 'bg-slate-100 text-slate-600 border-slate-300',
  };
  return (
    <span className={`badge border ${colorMap[type]}`}>
      {ANOMALY_TYPE_LABELS[type]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const colorMap: Record<Severity, string> = {
    critical: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-slate-500 text-white',
  };
  return (
    <span className={`badge ${colorMap[severity]}`}>
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function StatusBadge({ status }: { status: RecordStatus }) {
  const colorMap: Record<RecordStatus, string> = {
    pending: 'bg-slate-100 text-slate-700 border border-slate-300',
    processing: 'bg-blue-50 text-blue-700 border border-blue-300',
    resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-300',
    archived: 'bg-slate-50 text-slate-500 border border-slate-200',
  };
  return (
    <span className={`badge border ${colorMap[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
