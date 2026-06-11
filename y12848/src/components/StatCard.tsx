import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  trend?: string;
  trendUp?: boolean;
  color: 'primary' | 'emerald' | 'amber' | 'rose';
  delay?: number;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  color,
  delay = 0,
}: StatCardProps) {
  const colorMap = {
    primary: {
      bg: 'bg-primary-50',
      icon: 'bg-primary-500',
      text: 'text-primary-600',
      value: 'text-primary-700',
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'bg-emerald-500',
      text: 'text-emerald-600',
      value: 'text-emerald-700',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'bg-amber-500',
      text: 'text-amber-600',
      value: 'text-amber-700',
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'bg-rose-500',
      text: 'text-rose-600',
      value: 'text-rose-700',
    },
  };

  const colors = colorMap[color];

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 card-hover opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className={`text-3xl font-bold font-serif ${colors.value}`}>{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 ${colors.icon} rounded-lg flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
