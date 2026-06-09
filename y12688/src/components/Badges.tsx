import { RecordStatus, RecordType } from '../types';
import { STATUS_LABELS, TYPE_LABELS } from '../utils/constants';

interface StatusBadgeProps {
  status: RecordStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const cfg = STATUS_LABELS[status];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={`inline-flex items-center border rounded font-medium ${cfg.bg} ${cfg.color} ${sizeClass}`}>
      {cfg.label}
    </span>
  );
}

interface TypeBadgeProps {
  type: RecordType;
  size?: 'sm' | 'md';
}

export function TypeBadge({ type, size = 'sm' }: TypeBadgeProps) {
  const cfg = TYPE_LABELS[type];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={`inline-flex items-center border rounded font-medium ${cfg.bg} ${cfg.color} ${sizeClass}`}>
      {cfg.label}
    </span>
  );
}
