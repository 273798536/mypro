import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './Card';

interface DataCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'default' | 'blue' | 'green' | 'orange' | 'red';
  precision?: number;
}

export const DataCard = React.forwardRef<HTMLDivElement, DataCardProps>(
  ({ className, title, value, unit, trend, trendValue, icon, color = 'default', precision, ...props }, ref) => {
    const colors = {
      default: 'text-industrial-text',
      blue: 'text-blue-400',
      green: 'text-green-400',
      orange: 'text-orange-400',
      red: 'text-red-400',
    };

    const trendIcons = {
      up: <TrendingUp className="w-4 h-4 text-green-400" />,
      down: <TrendingDown className="w-4 h-4 text-red-400" />,
      stable: <Minus className="w-4 h-4 text-industrial-text-muted" />,
    };

    const displayValue = typeof value === 'number' && precision !== undefined
      ? value.toFixed(precision)
      : value;

    return (
      <Card ref={ref} className={cn(className)} {...props}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-industrial-text-muted mb-1">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-2xl font-bold font-mono tabular-nums', colors[color])}>
                {displayValue}
              </span>
              {unit && <span className="text-sm text-industrial-text-muted">{unit}</span>}
            </div>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                {trendIcons[trend]}
                <span className={cn('text-xs', trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-industrial-text-muted')}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('p-3 rounded-lg bg-industrial-bg-dark', colors[color])}>
              {icon}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

DataCard.displayName = 'DataCard';
