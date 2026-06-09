import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { DataAvailability } from '@/types';
import { AVAILABILITY_META } from '@/utils/diagnosis';

interface Props {
  availability: DataAvailability;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const ICONS = {
  available: CheckCircle2,
  pending: Clock,
  recollect: AlertTriangle,
};

export default function AvailabilityBadge({ availability, size = 'sm', showLabel = true }: Props) {
  const meta = AVAILABILITY_META[availability];
  const Icon = ICONS[availability];
  const isSmall = size === 'sm';

  return (
    <span
      className={`chip ${meta.bg} ${meta.color} border ${meta.border} ${isSmall ? 'text-[11px] px-2 py-0.5' : ''}`}
    >
      <Icon className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
