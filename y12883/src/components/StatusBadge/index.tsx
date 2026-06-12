import type { BuoyDataStatus, CorrectionStatus, SafetyLevel } from '@/types';
import { BUOY_STATUS_LABELS, CORRECTION_STATUS_LABELS, SAFETY_LEVEL_LABELS } from '@/types';

interface StatusBadgeProps {
  type: 'buoy' | 'correction' | 'safety';
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ type, status, size = 'md' }: StatusBadgeProps) {
  const getStyles = () => {
    const baseSize = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
    
    if (type === 'buoy') {
      const statusKey = status as BuoyDataStatus;
      const colorMap: Record<BuoyDataStatus, string> = {
        available: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        recollect: 'bg-red-500/20 text-red-400 border-red-500/30',
      };
      return {
        label: BUOY_STATUS_LABELS[statusKey] || status,
        className: `${baseSize} rounded-full border ${colorMap[statusKey] || ''}`,
      };
    }
    
    if (type === 'correction') {
      const statusKey = status as CorrectionStatus;
      const colorMap: Record<CorrectionStatus, string> = {
        pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      };
      return {
        label: CORRECTION_STATUS_LABELS[statusKey] || status,
        className: `${baseSize} rounded-full border ${colorMap[statusKey] || ''}`,
      };
    }
    
    if (type === 'safety') {
      const statusKey = status as SafetyLevel;
      const colorMap: Record<SafetyLevel, string> = {
        safe: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        caution: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        danger: 'bg-red-500/20 text-red-400 border-red-500/30',
      };
      return {
        label: SAFETY_LEVEL_LABELS[statusKey] || status,
        className: `${baseSize} rounded-full border font-medium ${colorMap[statusKey] || ''}`,
      };
    }
    
    return { label: status, className: baseSize };
  };

  const { label, className } = getStyles();

  return (
    <span className={className}>
      {label}
    </span>
  );
}
