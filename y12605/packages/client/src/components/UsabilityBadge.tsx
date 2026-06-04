import { USABILITY_LABELS, USABILITY_COLORS } from '@puzzle/shared';
import type { ResultUsability } from '@puzzle/shared';

interface UsabilityBadgeProps {
  type: ResultUsability;
}

export default function UsabilityBadge({ type }: UsabilityBadgeProps) {
  return (
    <span
      className="usability-badge"
      style={{
        backgroundColor: USABILITY_COLORS[type],
        color: 'white',
      }}
    >
      {USABILITY_LABELS[type]}
    </span>
  );
}
