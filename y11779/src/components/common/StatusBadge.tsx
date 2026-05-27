import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Tag, BarChart3 } from 'lucide-react';
import type { AnomalyType, SeverityLevel } from '../../types';
import { getAnomalyTypeLabel, getAnomalyTypeColor } from '../../utils/anomalyDetection';

interface StatusBadgeProps {
  type: 'coverage' | 'severity' | 'anomaly';
  value: string | boolean | number;
  target?: number;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, target = 0.9, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  if (type === 'coverage') {
    const coverage = typeof value === 'number' ? value : 0;
    const ratio = coverage / target;
    let bgColor = 'bg-red-100 text-red-700';
    let icon = <XCircle className="w-4 h-4" />;
    
    if (ratio >= 1) {
      bgColor = 'bg-emerald-100 text-emerald-700';
      icon = <CheckCircle className="w-4 h-4" />;
    } else if (ratio >= 0.9) {
      bgColor = 'bg-amber-100 text-amber-700';
      icon = <AlertTriangle className="w-4 h-4" />;
    }

    return (
      <span className={`inline-flex items-center gap-1 rounded-full ${bgColor} ${sizeClasses} font-medium`}>
        {icon}
        {(coverage * 100).toFixed(1)}%
      </span>
    );
  }

  if (type === 'severity') {
    const severity = value as SeverityLevel;
    const bgColor = severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
    const label = severity === 'error' ? '严重' : '警告';
    const icon = severity === 'error' 
      ? <XCircle className="w-4 h-4" /> 
      : <AlertTriangle className="w-4 h-4" />;

    return (
      <span className={`inline-flex items-center gap-1 rounded-full ${bgColor} ${sizeClasses} font-medium`}>
        {icon}
        {label}
      </span>
    );
  }

  if (type === 'anomaly') {
    const anomalyType = value as AnomalyType;
    const color = getAnomalyTypeColor(anomalyType);
    const label = getAnomalyTypeLabel(anomalyType);
    const icons: Record<AnomalyType, React.ReactNode> = {
      promotion: <Tag className="w-4 h-4" />,
      coverage: <AlertTriangle className="w-4 h-4" />,
      sample: <BarChart3 className="w-4 h-4" />
    };

    return (
      <span 
        className={`inline-flex items-center gap-1 rounded-full ${sizeClasses} font-medium`}
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icons[anomalyType]}
        {label}
      </span>
    );
  }

  return null;
};

export default StatusBadge;
