import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  suffix?: string;
  highlight?: boolean;
}

const colorConfigs = {
  default: 'from-slate-500 to-slate-600',
  success: 'from-green-500 to-emerald-600',
  warning: 'from-amber-500 to-orange-600',
  danger: 'from-red-500 to-rose-600',
  info: 'from-blue-500 to-cyan-600',
};

export default function MetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  color = 'default',
  suffix,
  highlight = false
}: MetricCardProps) {
  return (
    <div 
      className={cn(
        "bg-white rounded-xl p-5 border border-slate-200 transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1 hover:border-slate-300",
        highlight && "ring-2 ring-blue-500/20"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn(
              "text-3xl font-bold font-mono",
              highlight ? "text-blue-600" : "text-slate-800"
            )}>
              {value}
            </span>
            {suffix && (
              <span className="text-sm text-slate-400">{suffix}</span>
            )}
          </div>
          {trend && (
            <div className={cn(
              "mt-3 flex items-center gap-1 text-xs font-medium",
              trend.direction === 'up' ? "text-green-600" : "text-red-600"
            )}>
              {trend.direction === 'up' ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              <span>{trend.value}%</span>
              <span className="text-slate-400 font-normal ml-1">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white",
          colorConfigs[color]
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
