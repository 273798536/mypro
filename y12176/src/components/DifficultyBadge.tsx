import { cn } from '../lib/utils';
import type { DifficultyLevel } from '../types';
import { getDifficultyLabel } from '../utils/algorithms';

interface DifficultyBadgeProps {
  difficulty: DifficultyLevel;
  className?: string;
}

const difficultyStyles: Record<DifficultyLevel, string> = {
  easy: 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-emerald-200',
  medium: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-amber-200',
  hard: 'bg-gradient-to-r from-rose-400 to-rose-500 text-white shadow-rose-200',
};

export default function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold shadow-md',
        difficultyStyles[difficulty],
        className
      )}
    >
      {getDifficultyLabel(difficulty)}
    </span>
  );
}
