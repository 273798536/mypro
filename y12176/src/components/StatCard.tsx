import { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'indigo' | 'amber' | 'rose' | 'emerald' | 'blue';
  className?: string;
  onClick?: () => void;
}

const colorClasses: Record<string, string> = {
  indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
  amber: 'from-amber-500 to-amber-600 shadow-amber-200',
  rose: 'from-rose-500 to-rose-600 shadow-rose-200',
  emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
  blue: 'from-blue-500 to-blue-600 shadow-blue-200',
};

export default function StatCard({ title, value, icon, trend, color = 'indigo', className, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
          {trend && (
            <p className={cn(
              'text-xs font-medium mt-2 flex items-center gap-1',
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              {trend.value}%
              <span className="text-slate-400 ml-1">较上月</span>
            </p>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg',
          colorClasses[color]
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
