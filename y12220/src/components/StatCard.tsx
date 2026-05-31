import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TrendType = 'up' | 'down' | 'neutral';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: TrendType;
  trendValue?: string;
  description?: string;
  colorVariant?: 'primary' | 'amber' | 'green' | 'red';
  className?: string;
  onClick?: () => void;
}

const colorVariants = {
  primary: {
    bg: 'bg-primary-100 dark:bg-primary-900/30',
    icon: 'text-primary-700 dark:text-primary-400',
    border: 'border-primary-200 dark:border-primary-700',
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-700',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-700',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-700',
  },
};

const trendConfig = {
  up: {
    icon: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/30',
  },
  down: {
    icon: TrendingDown,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/30',
  },
  neutral: {
    icon: Minus,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-700',
  },
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  description,
  colorVariant = 'primary',
  className,
  onClick,
}: StatCardProps) {
  const colors = colorVariants[colorVariant];
  const TrendIcon = trend ? trendConfig[trend].icon : null;

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl border shadow-sm p-5',
        'hover:shadow-md transition-shadow duration-200',
        colors.border,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
          {trend && trendValue && TrendIcon && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium">
              <TrendIcon className="w-3.5 h-3.5" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'p-3 rounded-lg',
            colors.bg
          )}
        >
          <Icon className={cn('w-6 h-6', colors.icon)} />
        </div>
      </div>
    </div>
  );
}
