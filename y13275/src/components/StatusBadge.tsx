import { cn } from '@/lib/utils';
import type { PointStatus } from '@/types';
import { getStatusText } from '@/utils/format';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: PointStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    pending: {
      icon: Clock,
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      iconColor: 'text-yellow-500',
    },
    merged: {
      icon: CheckCircle,
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      iconColor: 'text-green-500',
    },
    abnormal: {
      icon: AlertTriangle,
      bg: 'bg-accent-50',
      text: 'text-accent-700',
      border: 'border-accent-200',
      iconColor: 'text-accent-500',
    },
  };

  const { icon: Icon, bg, text, border, iconColor } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        bg,
        text,
        border,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {getStatusText(status)}
    </span>
  );
}
