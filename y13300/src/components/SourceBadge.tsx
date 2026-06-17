import { EvidenceSource, SOURCE_LABELS, SOURCE_COLORS } from '../../shared/types.js';
import { cn } from '@/lib/utils';

interface SourceBadgeProps {
  source: EvidenceSource;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        SOURCE_COLORS[source]
      )}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}
