import React from 'react';
import { DataStatus } from '../types/common';
import { getStatusLabel } from '../utils/format';

interface StatusBadgeProps {
  status: DataStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const statusStyles: Record<DataStatus, { dot: string; bg: string; text: string; border: string }> = {
  [DataStatus.AVAILABLE]: {
    dot: 'bg-status-available',
    bg: 'bg-status-available/10',
    text: 'text-status-available',
    border: 'border-status-available/30',
  },
  [DataStatus.PENDING]: {
    dot: 'bg-status-pending',
    bg: 'bg-status-pending/10',
    text: 'text-status-pending',
    border: 'border-status-pending/30',
  },
  [DataStatus.NEED_REVIEW]: {
    dot: 'bg-status-review',
    bg: 'bg-status-review/10',
    text: 'text-status-review',
    border: 'border-status-review/30',
  },
  [DataStatus.RECOLLECT]: {
    dot: 'bg-status-recollect',
    bg: 'bg-status-recollect/10',
    text: 'text-status-recollect',
    border: 'border-status-recollect/30',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const styles = statusStyles[status];
  const label = getStatusLabel(status);

  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded ${padding} border ${styles.bg} ${styles.border} ${className}`}
    >
      <span className={`${dotSize} rounded-full ${styles.dot} flex-shrink-0`} />
      {showLabel && (
        <span className={`font-medium ${styles.text} ${fontSize}`}>{label}</span>
      )}
    </span>
  );
};
