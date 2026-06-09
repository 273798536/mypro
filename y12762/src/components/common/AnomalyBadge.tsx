import { useState } from 'react';
import { AlertTriangle, XCircle, AlertOctagon, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnomalySeverity } from '@/types';

interface AnomalyBadgeProps {
  severity: AnomalySeverity;
  type: string;
  message: string;
}

const severityConfig = {
  warning: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-400',
    text: 'text-yellow-800',
    iconText: 'text-yellow-600',
    label: '警告',
    Icon: AlertTriangle,
  },
  error: {
    bg: 'bg-orange-100',
    border: 'border-orange-400',
    text: 'text-orange-800',
    iconText: 'text-orange-600',
    label: '错误',
    Icon: XCircle,
  },
  critical: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-800',
    iconText: 'text-red-600',
    label: '严重',
    Icon: AlertOctagon,
  },
};

const typeLabels: Record<string, string> = {
  ph_out_of_range: 'pH值异常',
  concentration_error: '浓度错误',
  temperature_abnormal: '温度异常',
  formula_error: '公式错误',
};

export default function AnomalyBadge({ severity, type, message }: AnomalyBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[severity];
  const Icon = config.Icon;
  const typeLabel = typeLabels[type] || type;

  return (
    <div
      className={cn(
        'rounded-lg border shadow-sm cursor-pointer transition-all',
        config.bg,
        config.border
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon className={cn('w-4 h-4 flex-shrink-0', config.iconText)} />
        <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded bg-white/50', config.text)}>
          {config.label}
        </span>
        <span className={cn('text-sm font-medium', config.text)}>{typeLabel}</span>
        <div className="flex-1" />
        {expanded ? (
          <ChevronUp className={cn('w-4 h-4', config.iconText)} />
        ) : (
          <ChevronDown className={cn('w-4 h-4', config.iconText)} />
        )}
      </div>
      {expanded && (
        <div className={cn('px-3 pb-3 pt-1 border-t', config.border)}>
          <p className={cn('text-sm', config.text)}>{message}</p>
        </div>
      )}
    </div>
  );
}
