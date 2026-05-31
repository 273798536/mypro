import type { ExceptionType } from '../../shared/types';
import { EXCEPTION_TYPE_LABELS } from '../../shared/types';
import { cn } from '@/lib/utils';

const typeStyles: Record<ExceptionType, string> = {
  reading_gap: 'bg-orange-100 text-orange-700',
  discount_expired: 'bg-yellow-100 text-yellow-700',
  allocation_error: 'bg-red-100 text-red-700',
};

interface ExceptionBadgeProps {
  type: ExceptionType;
}

export default function ExceptionBadge({ type }: ExceptionBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        typeStyles[type]
      )}
    >
      {EXCEPTION_TYPE_LABELS[type]}
    </span>
  );
}
