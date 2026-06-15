import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: 'available' | 'suspended' | 'recollect' | 'pending' | 'default';
  subtitle?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'default',
  subtitle,
}: StatCardProps) {
  const getColorClasses = () => {
    const colors = {
      available: 'from-data-available/20 to-data-available/5 border-data-available/30 text-data-available',
      suspended: 'from-data-suspended/20 to-data-suspended/5 border-data-suspended/30 text-data-suspended',
      recollect: 'from-data-recollect/20 to-data-recollect/5 border-data-recollect/30 text-data-recollect',
      pending: 'from-data-pending/20 to-data-pending/5 border-data-pending/30 text-data-pending',
      default: 'from-ocean-500/20 to-ocean-500/5 border-ocean-500/30 text-ocean-300',
    };
    return colors[color];
  };

  const getIconBg = () => {
    const colors = {
      available: 'bg-data-available/20 text-data-available',
      suspended: 'bg-data-suspended/20 text-data-suspended',
      recollect: 'bg-data-recollect/20 text-data-recollect',
      pending: 'bg-data-pending/20 text-data-pending',
      default: 'bg-ocean-500/20 text-ocean-300',
    };
    return colors[color];
  };

  return (
    <div
      className={cn(
        'glass-panel p-5 border bg-gradient-to-br transition-all duration-300 hover:shadow-lg hover:shadow-ocean-500/10 card-hover',
        getColorClasses()
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-ocean-400 mb-1">{title}</p>
          <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-ocean-400 mt-1">{subtitle}</p>}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp className="w-3.5 h-3.5 text-data-available" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-data-recollect" />
              )}
              <span className="text-xs text-ocean-300">{trendValue}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            getIconBg()
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
