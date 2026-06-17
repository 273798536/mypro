import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  color?: 'navy' | 'amber' | 'moss' | 'rust' | 'sky';
  delay?: number;
}

const colorConfig = {
  navy: {
    accent: 'text-navy-600',
    bg: 'bg-navy-50',
    border: 'border-navy-200',
    card: 'card',
  },
  amber: {
    accent: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    card: 'card-amber',
  },
  moss: {
    accent: 'text-moss-600',
    bg: 'bg-moss-50',
    border: 'border-moss-200',
    card: 'card-moss',
  },
  rust: {
    accent: 'text-rust-600',
    bg: 'bg-rust-50',
    border: 'border-rust-200',
    card: 'card-rust',
  },
  sky: {
    accent: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    card: 'card-sky',
  },
};

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'navy',
  delay = 0,
}: MetricCardProps) => {
  const config = colorConfig[color];
  const animationClass = delay > 0 ? `animate-stagger-${delay}` : '';

  return (
    <div 
      className={`${config.card} p-5 opacity-0 animate-fade-in-up ${animationClass}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 ${config.bg} border ${config.border}`}>
          <Icon className={`w-5 h-5 ${config.accent}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend >= 0 ? 'text-moss-600' : 'text-rust-600'
          }`}>
            {trend >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <div className={`text-3xl font-bold font-mono ${config.accent}`}>
          {value}
        </div>
        <div className="text-sm font-medium text-navy-700">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-navy-500">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
