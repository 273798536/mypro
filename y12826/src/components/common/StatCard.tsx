import { formatNumber } from '@/utils/formatters';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'teal' | 'amber' | 'red' | 'slate';
}

export default function StatCard({
  title,
  value,
  unit,
  trend,
  trendValue,
  icon,
  color = 'teal',
}: StatCardProps) {
  const colorClasses = {
    teal: 'from-teal-900/30 to-teal-900/5 border-teal-800',
    amber: 'from-amber-900/30 to-amber-900/5 border-amber-800',
    red: 'from-red-900/30 to-red-900/5 border-red-800',
    slate: 'from-slate-800/50 to-slate-800/10 border-slate-700',
  };

  const valueColorClasses = {
    teal: 'text-teal-300',
    amber: 'text-amber-400',
    red: 'text-red-400',
    slate: 'text-slate-300',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColorClass =
    trend === 'up' ? 'text-teal-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500';

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-5 transition-transform hover:scale-[1.02] duration-200`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className={`font-display text-3xl ${valueColorClasses[color]}`}>
              {typeof value === 'number' ? formatNumber(value, 0) : value}
            </span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trendColorClass}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded bg-slate-900/50 ${valueColorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
