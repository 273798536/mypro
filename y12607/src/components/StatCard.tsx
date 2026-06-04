import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: 'blue' | 'red' | 'yellow' | 'green';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const colorStyles = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-green-50 text-green-700 border-green-200',
};

const iconBgStyles = {
  blue: 'bg-blue-100 text-blue-600',
  red: 'bg-red-100 text-red-600',
  yellow: 'bg-amber-100 text-amber-600',
  green: 'bg-green-100 text-green-600',
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  trendValue,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'border rounded-lg p-5 transition-all hover:shadow-md',
        colorStyles[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {trend && trendValue && (
            <p className="text-xs mt-2 opacity-70">
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', iconBgStyles[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
