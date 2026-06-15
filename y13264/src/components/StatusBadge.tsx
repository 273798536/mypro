import { Clock, Loader, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
import { ComplaintStatus } from '../utils/types';
import { STATUS_LABELS, STATUS_COLORS } from '../utils/constants';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: ComplaintStatus;
  className?: string;
  showIcon?: boolean;
}

const iconMap = {
  pending: Clock,
  processing: Loader,
  for_publication: Eye,
  publicized: CheckCircle,
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const Icon = iconMap[status];
  const colorClass = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300',
        colorClass,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </span>
  );
}

interface MergeStatusBadgeProps {
  status: 'none' | 'merged' | 'duplicate' | 'same_street';
  className?: string;
}

export function MergeStatusBadge({ status, className }: MergeStatusBadgeProps) {
  if (status === 'none') return null;

  const config = {
    merged: { label: '已归并', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Merge },
    duplicate: { label: '重复记录', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: AlertTriangle },
    same_street: { label: '同街口多单', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
  };

  const { label, color, icon: Icon } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        color,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </span>
  );
}

function Merge(props: React.ComponentProps<typeof Clock>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}
