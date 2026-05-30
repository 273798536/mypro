import { cn } from '@/lib/utils';
import { RARITY_COLORS } from '@/utils/gachaEngine';
import type { Rarity } from '@/types';

interface RarityBadgeProps {
  rarity: Rarity;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: 'px-1.5 py-0.5 text-[10px] font-bold min-w-[28px]',
  md: 'px-2 py-0.5 text-xs font-bold min-w-[36px]',
  lg: 'px-3 py-1 text-sm font-bold min-w-[48px]',
} as const;

export default function RarityBadge({ rarity, size = 'md' }: RarityBadgeProps) {
  const colors = RARITY_COLORS[rarity];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded border font-display tracking-wider',
        colors.bg,
        colors.text,
        colors.border,
        SIZE_MAP[size],
      )}
    >
      {rarity}
    </span>
  );
}
