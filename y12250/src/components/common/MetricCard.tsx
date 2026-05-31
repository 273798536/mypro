import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'safe' | 'warning' | 'danger';
  className?: string;
}

export default function MetricCard({
  label,
  value,
  unit,
  icon,
  trend,
  trendValue,
  status = 'safe',
  className,
}: MetricCardProps) {
  const statusColors = {
    safe: 'border-defi-success/30 bg-defi-success/5',
    warning: 'border-defi-warning/30 bg-defi-warning/5',
    danger: 'border-defi-danger/30 bg-defi-danger/5 animate-pulse',
  };

  const textColors = {
    safe: 'text-defi-success',
    warning: 'text-defi-warning',
    danger: 'text-defi-danger',
  };

  return (
    <div
      className={cn(
        'card border transition-all duration-300',
        statusColors[status],
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-defi-text-muted">{label}</span>
        {icon && <div className="text-defi-text-muted">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'text-2xl font-mono font-bold transition-colors duration-300',
            textColors[status]
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-defi-text-muted">{unit}</span>}
      </div>
      {trend && trendValue && (
        <div
          className={`flex items-center gap-1 mt-2 text-sm ${
            trend === 'up'
              ? 'text-defi-success'
              : trend === 'down'
              ? 'text-defi-danger'
              : 'text-defi-text-muted'
          }`}
        >
          {trend === 'up' && <TrendingUp size={14} />}
          {trend === 'down' && <TrendingDown size={14} />}
          {trend === 'neutral' && <Minus size={14} />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
