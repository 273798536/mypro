import { cn } from '@/lib/utils';
import { gapTypeLabel } from '@/utils/format';
import type { GapType } from '@/types';

interface GapTypeBadgeProps {
  type: GapType;
  size?: 'sm' | 'md';
}

const typeStyles: Record<GapType, string> = {
  sampling: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  migration: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  other: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function GapTypeBadge({ type, size = 'md' }: GapTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border rounded font-medium',
        typeStyles[type],
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'
      )}
    >
      {gapTypeLabel(type)}
    </span>
  );
}
