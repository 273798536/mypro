import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  trend?: { value: number; isUp: boolean };
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  subtitle,
  onClick,
  className
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl',
        'border border-white/20 hover:shadow-2xl transition-all duration-300',
        'hover:-translate-y-1 cursor-pointer relative overflow-hidden',
        className
      )}
      style={{ boxShadow: `0 10px 40px -10px ${color}30` }}
    >
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
        style={{ backgroundColor: color }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-3xl font-bold mt-2" style={{ color }}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
        </div>

        {trend && (
          <div className="mt-4 flex items-center gap-2">
            {trend.isUp ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                trend.isUp ? 'text-green-500' : 'text-red-500'
              )}
            >
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-gray-400">较上批次</span>
          </div>
        )}
      </div>
    </div>
  );
}
