import type { WarningStatus } from '@/types';
import { STATUS_LABEL } from '@/types';

interface Props {
  status: WarningStatus;
  size?: 'sm' | 'md';
}

const styles: Record<WarningStatus, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  returned: 'bg-slate-100 text-slate-700 ring-1 ring-slate-500/20',
};

export default function StatusBadge({ status, size = 'md' }: Props) {
  const sizeCls = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-md font-medium ${sizeCls} ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
