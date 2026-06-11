import type { DetectionType } from 'shared/types';
import { DETECTION_TYPE_LABEL } from 'shared/types';

const STYLES: Record<DetectionType, string> = {
  jump: 'bg-sky-50 text-sky-700 border-sky-200',
  gap: 'bg-violet-50 text-violet-700 border-violet-200',
  temp_delta: 'bg-orange-50 text-orange-700 border-orange-200',
  duplicate: 'bg-pink-50 text-pink-700 border-pink-200',
  missing_value: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function DetectionBadge({ type }: { type: DetectionType }) {
  return (
    <span className={`chip border ${STYLES[type]}`}>{DETECTION_TYPE_LABEL[type]}</span>
  );
}
