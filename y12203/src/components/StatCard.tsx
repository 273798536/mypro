import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'gold' | 'red';
}

export default function StatCard({ title, value, icon: Icon, trend, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    gold: 'bg-accent-50 text-accent-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-400">较上月</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
