import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

type StatusType = 'success' | 'warning' | 'error' | 'pending' | 'info';

interface StatusBadgeProps {
  type: StatusType;
  children: ReactNode;
}

const statusConfig: Record<StatusType, { bg: string; text: string; border: string; icon: typeof AlertTriangle }> = {
  success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
  warning: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
  error: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle }
};

export function StatusBadge({ type, children }: StatusBadgeProps) {
  const config = statusConfig[type];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      <Icon size={12} />
      {children}
    </span>
  );
}
