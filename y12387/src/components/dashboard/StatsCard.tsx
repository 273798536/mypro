import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'accent' | 'success' | 'warning' | 'danger';
}

const colorConfig = {
  accent: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/20' },
  success: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  danger: { bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/20' },
};

export const StatsCard = ({ title, value, icon: Icon, trend, color }: StatsCardProps) => {
  const config = colorConfig[color];

  return (
    <div className={`p-6 rounded-xl border ${config.bg} ${config.border} hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${config.text}`}>{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% 较上周
            </p>
          )}
        </div>
        <div className={`p-4 rounded-xl ${config.bg}`}>
          <Icon className={`w-8 h-8 ${config.text}`} />
        </div>
      </div>
    </div>
  );
};
