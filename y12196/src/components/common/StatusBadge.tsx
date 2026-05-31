import { statusLabels } from '../../data/mockData';
import type { BoxStatus, CityStatus, ShipmentStatus } from '../../types';

interface StatusBadgeProps {
  status: BoxStatus | CityStatus | ShipmentStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const label = statusLabels[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${label.color} ${sizeClass}`}>
      {label.label}
    </span>
  );
}