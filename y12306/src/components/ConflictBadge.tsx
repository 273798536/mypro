import React from 'react';
import { AlertTriangle, XCircle, Info } from 'lucide-react';
import { ConflictType, ConflictSeverity, CONFLICT_TYPE_LABELS } from '../types';
import { cn } from '@/lib/utils';

interface ConflictBadgeProps {
  type: ConflictType;
  severity: ConflictSeverity;
  showLabel?: boolean;
  className?: string;
}

const severityConfig: Record<ConflictSeverity, { color: string; bgColor: string; icon: React.ElementType }> = {
  high: { color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: XCircle },
  medium: { color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', icon: AlertTriangle },
  low: { color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', icon: Info },
};

export const ConflictBadge: React.FC<ConflictBadgeProps> = ({
  type,
  severity,
  showLabel = true,
  className,
}) => {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {showLabel && CONFLICT_TYPE_LABELS[type]}
    </span>
  );
};
