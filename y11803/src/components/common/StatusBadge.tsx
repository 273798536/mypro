import { AlertTriangle, CheckCircle, XCircle, Clock, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { getStatusLabel, getStatusColor } from '@/utils/formatters';
import type { RefundStatus, BatchStatus } from '@/types';

interface StatusBadgeProps {
  status: RefundStatus | BatchStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const iconSizes = {
  sm: 12,
  md: 14,
  lg: 16,
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  frozen: Lock,
  processed: CheckCircle,
  failed: AlertCircle,
  active: Loader2,
  completed: CheckCircle,
  suspended: AlertTriangle,
  reconciled: CheckCircle,
};

export function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const Icon = statusIcons[status] || AlertCircle;
  const colorClass = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium border rounded ${colorClass} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon size={iconSizes[size]} className="shrink-0" />}
      <span className="font-mono tabular-nums">{label}</span>
    </span>
  );
}
