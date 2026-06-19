import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { RecordStatus } from '../../shared/types.js';
import { STATUS_LABELS } from '../../shared/types.js';

interface StatusBadgeProps {
  status: RecordStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<RecordStatus, { bg: string; text: string; border: string; icon: typeof CheckCircle }> = {
  AVAILABLE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle },
  NEEDS_REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', icon: AlertTriangle },
  UNAVAILABLE: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const label = STATUS_LABELS[status];
  
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1 text-sm gap-1.5';
  
  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full border ${config.bg} ${config.text} ${config.border} font-medium transition-colors`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {label}
    </span>
  );
}
