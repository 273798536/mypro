import type { SampleStatus } from '../../shared/types';
import { SAMPLE_STATUS_LABELS, SAMPLE_STATUS_COLORS } from '../../shared/types';

interface StatusBadgeProps {
  status: SampleStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge ${SAMPLE_STATUS_COLORS[status]}`}>
      {SAMPLE_STATUS_LABELS[status]}
    </span>
  );
}
