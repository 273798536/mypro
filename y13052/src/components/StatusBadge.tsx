import { STATUS_LABEL, OBJECT_TYPE_LABEL, RISK_LABEL } from '../../shared/types.js';
import type { CaseStatus, ObjectType, RiskLevel } from '../../shared/types.js';

export function StatusBadge({ status }: { status: CaseStatus }) {
  const config: Record<CaseStatus, { dot: string; bg: string; text: string; border: string }> = {
    pending: { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    approved: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    rejected: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    abnormal: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  };
  const c = config[status];
  return (
    <span className={`eng-chip ${c.bg} ${c.text} ${c.border}`}>
      <span className={`status-dot ${c.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ObjectTypeBadge({ type }: { type: ObjectType }) {
  const config: Record<ObjectType, string> = {
    wind_turbine: 'bg-slate-100 text-slate-700 border-slate-300',
    transmission_tower: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cable: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    access_road: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return (
    <span className={`eng-chip ${config[type]}`}>
      {OBJECT_TYPE_LABEL[type]}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const config: Record<RiskLevel, { bg: string; text: string; border: string }> = {
    low: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };
  const c = config[level];
  return (
    <span className={`eng-chip ${c.bg} ${c.text} ${c.border}`}>
      {RISK_LABEL[level]}
    </span>
  );
}
