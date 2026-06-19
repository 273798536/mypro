import { Database, FileWarning, ShieldAlert, Copy, CircleCheck } from 'lucide-react';
import type { AnomalyType } from '../../shared/types.js';
import { ANOMALY_LABELS } from '../../shared/types.js';

interface AnomalyBadgeProps {
  type: AnomalyType;
  size?: 'sm' | 'md';
}

const anomalyConfig: Record<AnomalyType, { bg: string; text: string; border: string; icon: typeof Database }> = {
  SLOW_QUERY_CONFLICT: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', icon: Database },
  SCHEMA_CONFLICT: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', icon: FileWarning },
  BACKUP_GAP: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: ShieldAlert },
  DUPLICATE_IMPORT: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', icon: Copy },
  NONE: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', icon: CircleCheck },
};

export function AnomalyBadge({ type, size = 'md' }: AnomalyBadgeProps) {
  const config = anomalyConfig[type];
  const Icon = config.icon;
  const label = ANOMALY_LABELS[type];
  
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1 text-sm gap-1.5';
  
  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full border ${config.bg} ${config.text} ${config.border} font-medium`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {label}
    </span>
  );
}
