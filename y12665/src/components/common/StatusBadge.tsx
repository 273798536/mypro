import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatusBadgeVariant =
  | 'draft'
  | 'reviewing'
  | 'confirmed'
  | 'archived'
  | 'approved'
  | 'pending'
  | 'rejected';

const variantStyles: Record<StatusBadgeVariant, string> = {
  draft: 'bg-slate-600/30 text-slate-300 border-slate-500/40',
  reviewing: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40',
  confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
  rejected: 'bg-red-500/15 text-red-300 border-red-400/40',
};

const variantLabels: Record<StatusBadgeVariant, string> = {
  draft: '草稿',
  reviewing: '审核中',
  confirmed: '已确认',
  archived: '已归档',
  approved: '已通过',
  pending: '待复核',
  rejected: '已驳回',
};

interface StatusBadgeProps {
  status: StatusBadgeVariant;
  label?: string;
  className?: string;
  children?: ReactNode;
}

export function StatusBadge({ status, label, className, children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border',
        variantStyles[status],
        className,
      )}
    >
      {children || label || variantLabels[status]}
    </span>
  );
}

export default StatusBadge;
