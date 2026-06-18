import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Metric } from '@/types';
import { formatDelta, getDeltaColor, cn } from '@/utils/helpers';

interface MetricCardProps {
  metric: Metric;
  showDelta?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function MetricCard({ metric, showDelta = true, size = 'md' }: MetricCardProps) {
  const getTrendIcon = () => {
    if (metric.delta > 0) return <TrendingUp size={14} className="text-accent-green" />;
    if (metric.delta < 0) return <TrendingDown size={14} className="text-accent-red" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const valueSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div
      className={cn(
        'bg-bg-secondary rounded-lg border border-border-color transition-all duration-200',
        'hover:border-accent-blue/30 hover:shadow-lg',
        metric.isAbnormal && 'glow-border-red animate-breathe',
        sizeClasses[size]
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className={cn(
            'text-gray-400 font-medium',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}
        >
          {metric.name}
        </span>
        {showDelta && metric.delta !== 0 && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={cn('text-xs font-mono', getDeltaColor(metric.delta))}>
              {formatDelta(metric.delta)}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-display font-bold text-white',
            valueSizeClasses[size]
          )}
        >
          {metric.value}%
        </span>
        {metric.isAbnormal && (
          <span className="text-xs px-2 py-0.5 rounded bg-accent-red/10 text-accent-red">
            异常
          </span>
        )}
      </div>
    </div>
  );
}
