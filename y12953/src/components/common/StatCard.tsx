import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'default' | 'amber' | 'emerald' | 'red';
  delay?: number;
}

const colorMap = {
  default: 'from-navy-400 to-navy-600',
  amber: 'from-amber-400 to-amber-600',
  emerald: 'from-emerald-400 to-emerald-600',
  red: 'from-red-400 to-red-600',
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color = 'default',
  delay = 0,
}: StatCardProps) {
  return (
    <div
      className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-5 hover:border-navy-600/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy-900/30 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-navy-300 font-medium">{title}</p>
          <p className="mt-2 text-3xl font-bold font-mono text-white">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'mt-2 text-xs flex items-center gap-1',
                trendUp ? 'text-emerald-400' : 'text-amber-400'
              )}
            >
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div
          className={cn(
          'p-3 rounded-lg bg-gradient-to-br shadow-lg',
          colorMap[color]
        )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
