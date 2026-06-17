import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

type KpiColor = 'industrial' | 'success' | 'warning' | 'danger';

interface KpiCardProps {
  title: string;
  value: string | number;
  deltaValue?: string | number;
  deltaType?: 'up' | 'down';
  icon: LucideIcon;
  color?: KpiColor;
  onClick?: () => void;
}

const colorMap: Record<KpiColor, { bar: string; bg: string; text: string }> = {
  industrial: {
    bar: 'bg-industrial',
    bg: 'bg-industrial-100',
    text: 'text-industrial',
  },
  success: {
    bar: 'bg-success',
    bg: 'bg-success-100',
    text: 'text-success',
  },
  warning: {
    bar: 'bg-warning',
    bg: 'bg-warning-100',
    text: 'text-warning',
  },
  danger: {
    bar: 'bg-danger',
    bg: 'bg-danger-100',
    text: 'text-danger',
  },
};

const deltaColorMap = {
  up: 'text-success',
  down: 'text-danger',
};

const KpiCard = ({
  title,
  value,
  deltaValue,
  deltaType = 'up',
  icon: Icon,
  color = 'industrial',
  onClick,
}: KpiCardProps) => {
  const colors = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colors.bar}`} />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-11 h-11 ${colors.bg} rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}
          >
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          {deltaValue !== undefined && (
            <div
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                deltaType === 'up' ? 'bg-success-50' : 'bg-danger-50'
              } ${deltaColorMap[deltaType]}`}
            >
              {deltaType === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{deltaValue}</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default KpiCard;
