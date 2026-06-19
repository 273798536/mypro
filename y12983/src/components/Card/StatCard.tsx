import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'amber' | 'emerald' | 'red' | 'purple';
}

const colorStyles = {
  blue: 'from-blue-600/20 to-blue-600/5 text-blue-400 border-blue-500/20',
  amber: 'from-amber-600/20 to-amber-600/5 text-amber-400 border-amber-500/20',
  emerald: 'from-emerald-600/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20',
  red: 'from-red-600/20 to-red-600/5 text-red-400 border-red-500/20',
  purple: 'from-purple-600/20 to-purple-600/5 text-purple-400 border-purple-500/20',
};

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  color = 'blue',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border bg-gradient-to-br p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
        colorStyles[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold font-mono tracking-tight">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'mt-1 text-xs',
                trendUp ? 'text-emerald-400' : 'text-slate-500'
              )}
            >
              {trend}
            </p>
          )}
        </div>
        <div className="opacity-60">{icon}</div>
      </div>
    </div>
  );
}
