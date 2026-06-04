import React from 'react';
import { MaterialStatus, MATERIAL_STATUS_LABELS, AnomalyType, ANOMALY_TYPE_LABELS, GameStatus, ActionType, ACTION_TYPE_LABELS } from '@/types';

type StatusType = MaterialStatus | AnomalyType | GameStatus | ActionType;

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { className: string; icon?: string }> = {
  pending: { className: 'badge-neutral', icon: '⏳' },
  hit: { className: 'badge-success', icon: '✅' },
  anomaly: { className: 'badge-danger', icon: '⚠️' },
  skipped: { className: 'badge-neutral', icon: '⏭️' },
  color_out_of_bounds: { className: 'badge-danger', icon: '🎨' },
  route_deviation: { className: 'badge-warning', icon: '↪️' },
  missing_marker: { className: 'badge-danger', icon: '❌' },
  idle: { className: 'badge-neutral', icon: '⏸️' },
  playing: { className: 'badge-success', icon: '▶️' },
  paused: { className: 'badge-warning', icon: '⏸️' },
  finished: { className: 'badge-success', icon: '✅' },
  mark_hit: { className: 'badge-success', icon: '✅' },
  mark_anomaly: { className: 'badge-danger', icon: '⚠️' },
  update_route: { className: 'badge-neutral', icon: '📍' },
  import_material: { className: 'badge-neutral', icon: '📥' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status] || statusConfig.pending;
  const label = (MATERIAL_STATUS_LABELS as Record<string, string>)[status] ||
                (ANOMALY_TYPE_LABELS as Record<string, string>)[status] ||
                (ACTION_TYPE_LABELS as Record<string, string>)[status] ||
                status;

  return (
    <span className={`badge ${config.className} ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''}`}>
      {config.icon && <span>{config.icon}</span>}
      {label}
    </span>
  );
};
