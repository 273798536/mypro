import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  status: 'normal' | 'warning' | 'danger';
  icon: ReactNode;
}

const StatsCard = ({ label, value, unit, trend, status, icon }: StatsCardProps) => {
  const statusColors = {
    normal: 'from-green-500/20 to-green-500/5 border-green-500/30',
    warning: 'from-alert-yellow/20 to-alert-yellow/5 border-alert-yellow/30',
    danger: 'from-alert-red/20 to-alert-red/5 border-alert-red/30',
  };

  const iconColors = {
    normal: 'text-green-400',
    warning: 'text-alert-yellow',
    danger: 'text-alert-red',
  };

  const valueColors = {
    normal: 'text-green-400',
    warning: 'text-alert-yellow',
    danger: 'text-alert-red',
  };

  return (
    <div className={`card card-hover p-5 bg-gradient-to-br ${statusColors[status]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-dark-400 mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-mono font-bold ${valueColors[status]} glow-text`}>
              {value}
            </span>
            {unit && <span className="text-sm text-dark-400">{unit}</span>}
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-alert-red" />
              ) : trend < 0 ? (
                <TrendingDown className="w-4 h-4 text-green-400" />
              ) : (
                <Minus className="w-4 h-4 text-dark-400" />
              )}
              <span className={`text-xs ${
                trend > 0 ? 'text-alert-red' : trend < 0 ? 'text-green-400' : 'text-dark-400'
              }`}>
                {Math.abs(trend)}% 较昨日
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-dark-800/50 ${iconColors[status]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
