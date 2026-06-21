import type { RecordStatus, BoundaryResult } from '@shared/types';
import { STATUS_LABEL, RESULT_LABEL } from '@shared/types';
import { CheckCircle2, XCircle, HelpCircle, AlertTriangle, Pencil, Handshake } from 'lucide-react';

const STATUS_STYLES: Record<RecordStatus, string> = {
  pending: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  revoked: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  need_evidence: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  manual_overruled: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
};

const STATUS_ICON: Record<RecordStatus, typeof HelpCircle> = {
  pending: HelpCircle,
  confirmed: CheckCircle2,
  revoked: XCircle,
  need_evidence: AlertTriangle,
  manual_overruled: Pencil,
};

export function StatusBadge({ status }: { status: RecordStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border ${STATUS_STYLES[status]}`}
    >
      <Icon className="w-3 h-3" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const RESULT_STYLES: Record<BoundaryResult, string> = {
  pass: 'text-emerald-400',
  fail: 'text-rose-400',
  unknown: 'text-amber-400',
};

const RESULT_ICON: Record<BoundaryResult, typeof HelpCircle> = {
  pass: CheckCircle2,
  fail: XCircle,
  unknown: HelpCircle,
};

export function ResultBadge({ result }: { result: BoundaryResult }) {
  const Icon = RESULT_ICON[result];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${RESULT_STYLES[result]}`}>
      <Icon className="w-3.5 h-3.5" />
      {RESULT_LABEL[result]}
    </span>
  );
}

export function CategoryChip({ label, count, color }: { label: string; count: number; color: 'emerald' | 'amber' | 'indigo' }) {
  const colorMap = {
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border ${colorMap[color]}`}>
      <Handshake className="w-3 h-3" />
      {label}
      <span className="px-1.5 py-px rounded bg-black/30 font-mono">{count}</span>
    </span>
  );
}
