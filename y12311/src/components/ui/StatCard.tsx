import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  trend,
  trendValue,
  icon,
  color = 'primary',
  className,
  delay = 0,
}) => {
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-success-500 to-success-600',
    warning: 'from-warning-500 to-warning-600',
    danger: 'from-danger-500 to-danger-600',
    neutral: 'from-neutral-500 to-neutral-600',
  };

  const bgColorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
    neutral: 'bg-neutral-100 text-neutral-600',
  };

  const trendIcon = trend === 'up' ? (
    <TrendingUp size={14} className="text-success-500" />
  ) : trend === 'down' ? (
    <TrendingDown size={14} className="text-danger-500" />
  ) : (
    <Minus size={14} className="text-neutral-500" />
  );

  return (
    <div
      className={cn(
        'card relative overflow-hidden opacity-0 animate-fade-in-up',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${colorClasses[color]}`}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-neutral-800 font-serif">
              {value}
            </span>
            {unit && <span className="text-sm text-neutral-500">{unit}</span>}
          </div>

          {trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trendIcon}
              <span
                className={`text-xs ${
                  trend === 'up'
                    ? 'text-success-600'
                    : trend === 'down'
                    ? 'text-danger-600'
                    : 'text-neutral-500'
                }`}
              >
                {trendValue}
              </span>
              <span className="text-xs text-neutral-400">较昨日</span>
            </div>
          )}
        </div>

        <div className={`p-3 rounded-lg ${bgColorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
