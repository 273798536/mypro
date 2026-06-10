import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'accent' | 'warning' | 'danger';
  subtitle?: string;
  progress?: number;
}

const colorStyles = {
  primary: {
    bg: 'from-primary-500 to-primary-700',
    iconBg: 'bg-white/20',
    glow: 'shadow-primary-500/30',
  },
  accent: {
    bg: 'from-accent-500 to-accent-700',
    iconBg: 'bg-white/20',
    glow: 'shadow-accent-500/30',
  },
  warning: {
    bg: 'from-warning-500 to-warning-700',
    iconBg: 'bg-white/20',
    glow: 'shadow-warning-500/30',
  },
  danger: {
    bg: 'from-danger-500 to-danger-700',
    iconBg: 'bg-white/20',
    glow: 'shadow-danger-500/30',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary',
  subtitle,
  progress,
}: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br',
        styles.bg,
        'shadow-lg',
        styles.glow,
        'transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl'
      )}
    >
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -right-16 -bottom-16 w-40 h-40 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-white/80">{title}</p>
            <p className="mt-1 text-3xl font-bold font-mono animate-number-count">{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-white/70">{subtitle}</p>}
          </div>
          <div className={cn('p-3 rounded-xl', styles.iconBg)}>
            <Icon size={24} />
          </div>
        </div>

        {trend && (
          <div className="flex items-center gap-1 text-sm">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                trend.isPositive ? 'text-accent-200' : 'text-white/70'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-white/60">较昨日</span>
          </div>
        )}

        {progress !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/70">AI分析进度</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
