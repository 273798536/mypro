import { STATUS_LABELS, ANNOTATION_COLORS } from '@puzzle/shared';
import type { ReviewStatus } from '@puzzle/shared';

interface StatusBadgeProps {
  status: ReviewStatus;
}

const STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: ANNOTATION_COLORS.warning,
  in_progress: ANNOTATION_COLORS.note,
  completed: ANNOTATION_COLORS.correct,
  needs_review: '#f59e0b',
  rejected: ANNOTATION_COLORS.error,
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className="status-badge"
      style={{
        backgroundColor: `${STATUS_COLORS[status]}15`,
        color: STATUS_COLORS[status],
        border: `1px solid ${STATUS_COLORS[status]}30`,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
