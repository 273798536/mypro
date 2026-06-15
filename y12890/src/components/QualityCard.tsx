import React from 'react';
import { AlertCircle, FileWarning, GitCompare, Clock, AlertTriangle } from 'lucide-react';
import { getQualityScoreColor } from '../utils/color';
import { formatNumber } from '../utils/format';

interface QualityCardProps {
  title: string;
  value: number;
  unit?: string;
  description: string;
  type: 'null' | 'duplicate' | 'unit' | 'timezone' | 'range' | 'score';
  delay?: number;
}

const iconMap = {
  null: AlertCircle,
  duplicate: FileWarning,
  unit: GitCompare,
  timezone: Clock,
  range: AlertTriangle,
  score: AlertCircle,
};

const colorMap = {
  null: 'text-status-pending',
  duplicate: 'text-status-pending',
  unit: 'text-status-review',
  timezone: 'text-status-pending',
  range: 'text-status-recollect',
  score: 'text-tide-500',
};

const bgColorMap = {
  null: 'bg-status-pending/10',
  duplicate: 'bg-status-pending/10',
  unit: 'bg-status-review/10',
  timezone: 'bg-status-pending/10',
  range: 'bg-status-recollect/10',
  score: 'bg-tide-500/10',
};

export const QualityCard: React.FC<QualityCardProps> = ({
  title,
  value,
  unit,
  description,
  type,
  delay = 0,
}) => {
  const Icon = iconMap[type];
  const isScore = type === 'score';
  const valueColor = isScore ? getQualityScoreColor(value) : colorMap[type];

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 opacity-0 animate-fade-in-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${bgColorMap[type]}`}>
          <Icon className={`w-5 h-5 ${colorMap[type]}`} />
        </div>
        <div className="text-right">
          <div
            className={`text-2xl font-bold font-mono`}
            style={{ color: value > 0 && !isScore ? colorMap[type].replace('text-', '#') : valueColor }}
          >
            {isScore ? `${formatNumber(value, 0)}${unit || ''}` : value}
          </div>
          {unit && !isScore && (
            <div className="text-xs text-slate-500">{unit}</div>
          )}
        </div>
      </div>
      <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
};
