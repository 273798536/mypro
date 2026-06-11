import type { ReconciliationStatus } from '@/types';
import { STATUS_LABEL } from '@/types';

const colorMap: Record<ReconciliationStatus, string> = {
  confirmed:
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-inner-status',
  pending:
    'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-inner-status',
  returned:
    'bg-rose-500/10 text-rose-400 border-rose-500/40 shadow-inner-status',
};

interface Props {
  status: ReconciliationStatus;
  pulse?: boolean;
}

export function StatusBadge({ status, pulse }: Props) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium tracking-wide ' +
        colorMap[status] +
        (pulse ? ' status-change-animate' : '')
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
