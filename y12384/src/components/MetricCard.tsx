import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: 'primary' | 'warning' | 'danger' | 'success';
  delay?: number;
}

const colorClasses = {
  primary: 'bg-primary-50 text-primary-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  success: 'bg-success-50 text-success-600',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color,
  delay = 0,
}) => {
  return (
    <div
      className="card p-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-surface-800 mt-2 font-display">
            {value}
          </p>
          {trend && trendValue && (
            <p
              className={`text-sm mt-2 ${
                trend === 'up'
                  ? 'text-success-600'
                  : trend === 'down'
                  ? 'text-danger-600'
                  : 'text-surface-500'
              }`}
            >
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
