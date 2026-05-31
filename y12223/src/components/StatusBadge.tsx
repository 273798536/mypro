import { cn } from '@/lib/utils';
import type { BillStatus } from '../types';

interface StatusBadgeProps {
  status: BillStatus;
}

const statusConfig: Record<
  BillStatus,
  { label: string; className: string; pulse?: boolean }
> = {
  normal: { label: '正常', className: 'bg-emerald-100 text-emerald-700' },
  missing_fields: {
    label: '缺字段',
    className: 'bg-amber-100 text-amber-700',
    pulse: true,
  },
  late_supplement: {
    label: '晚补',
    className: 'bg-orange-100 text-orange-700',
  },
  category_mismatch: {
    label: '科目串片',
    className: 'bg-rose-100 text-rose-700',
    pulse: true,
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        config.pulse && 'animate-pulse'
      )}
    >
      {config.pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      )}
      {config.label}
    </span>
  );
}
