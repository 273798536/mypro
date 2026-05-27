import React from 'react';
import { TrendingUp, TrendingDown, Target, FileWarning, Layers, Tag } from 'lucide-react';
import { formatNumber, formatPercentage, getCoverageStatusColor } from '../../utils/formatters';

interface MetricCardProps {
  title: string;
  value: number;
  format: 'number' | 'percentage' | 'currency';
  icon: 'coverage' | 'records' | 'anomalies' | 'categories' | 'promotion';
  target?: number;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  format, 
  icon, 
  target,
  subtitle 
}) => {
  const icons = {
    coverage: <Target className="w-6 h-6" />,
    records: <Layers className="w-6 h-6" />,
    anomalies: <FileWarning className="w-6 h-6" />,
    categories: <TrendingUp className="w-6 h-6" />,
    promotion: <Tag className="w-6 h-6" />
  };

  const formatValue = () => {
    switch (format) {
      case 'percentage':
        return formatPercentage(value);
      case 'currency':
        return `¥${formatNumber(value)}`;
      default:
        return formatNumber(value);
    }
  };

  const getStatusColor = () => {
    if (icon === 'coverage' && target) {
      return getCoverageStatusColor(value, target);
    }
    if (icon === 'anomalies') {
      return value > 0 ? '#ef4444' : '#10b981';
    }
    return '#3b82f6';
  };

  const getTrendIcon = () => {
    if (icon === 'coverage' && target) {
      return value >= target 
        ? <TrendingUp className="w-4 h-4 text-emerald-500" />
        : <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  const color = getStatusColor();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span 
              className="text-2xl font-bold"
              style={{ color, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
            >
              {formatValue()}
            </span>
            {getTrendIcon()}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
          )}
          {icon === 'coverage' && target && (
            <div className="mt-3">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((value / target) * 100, 100)}%`,
                    backgroundColor: color 
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                目标: {formatPercentage(target)}
              </p>
            </div>
          )}
        </div>
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icons[icon]}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
