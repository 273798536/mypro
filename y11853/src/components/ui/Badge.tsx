import { cn } from '../../lib/utils';
import { COLORS } from '../../utils/color';
import type { ResultCategory } from '../../types/analysis';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'category';
  category?: ResultCategory;
}

export function Badge({
  children,
  className,
  variant = 'default',
  category,
}: BadgeProps) {
  const variants = {
    default: 'bg-slate-700/80 text-slate-300 border border-slate-600/50',
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    category: '',
  };
  
  let variantStyles = variants[variant];
  
  if (variant === 'category' && category) {
    const categoryColors: Record<ResultCategory, string> = {
      ready: `text-emerald-400 border border-emerald-500/30`,
      needReview: `text-amber-400 border border-amber-500/30`,
      filterFailed: `text-red-400 border border-red-500/30`,
    };
    variantStyles = categoryColors[category];
  }
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variantStyles,
        className
      )}
    >
      {children}
    </span>
  );
}
