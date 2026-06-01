import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  color: 'indigo' | 'green' | 'orange' | 'red' | 'purple';
  className?: string;
}

const colorClasses = {
  indigo: 'from-indigo-500 to-indigo-600',
  green: 'from-emerald-500 to-emerald-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600',
  purple: 'from-purple-500 to-purple-600'
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
  className
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="mt-3 flex items-center gap-1">
              <span className={cn(
                'text-xs font-medium',
                trend >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
              <span className="text-xs text-slate-400">较上周</span>
            </div>
          )}
        </div>
        <div className={cn(
          'rounded-2xl bg-gradient-to-br p-3',
          colorClasses[color]
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className={cn(
        'absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r',
        colorClasses[color]
      )} />
    </div>
  );
}
