import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'normal' | 'warning' | 'danger';
  subtitle?: string;
  className?: string;
  delay?: number;
}

export default function DataCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendValue,
  status = 'normal',
  subtitle,
  className,
  delay = 0,
}: DataCardProps) {
  const statusColors = {
    normal: 'text-ocean-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
  };

  const statusGlow = {
    normal: 'shadow-ocean-500/20',
    warning: 'shadow-amber-500/20',
    danger: 'shadow-red-500/20',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm',
        'p-5 transition-all duration-300 hover:bg-white/10 hover:shadow-lg',
        statusGlow[status],
        className
      )}
      style={{
        opacity: 0,
        animation: `fadeInUp 0.6s ease-out ${delay}ms forwards`,
      }}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ocean-500/50 to-transparent" />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className={cn('text-3xl font-bold font-display', statusColors[status])}>
              {value}
            </span>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={cn('p-2 rounded-lg bg-white/5', statusColors[status])}>
            {icon}
          </div>
        )}
      </div>

      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span className={cn(
            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
          )}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
          <span className="text-gray-400">{trendValue}</span>
        </div>
      )}
    </div>
  );
}
