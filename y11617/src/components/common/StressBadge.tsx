import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import type { StressLevel } from '../../types';

interface StressBadgeProps {
  level: StressLevel;
  reasons?: string[];
  compact?: boolean;
}

export default function StressBadge({ level, reasons, compact }: StressBadgeProps) {
  if (level === 'none') {
    if (compact) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <CheckCircle size={12} />
        正常
      </span>
    );
  }

  const config = {
    warning: {
      icon: AlertTriangle,
      bgClass: 'bg-yellow-50 border-yellow-300',
      textClass: 'text-yellow-800',
      label: '警告'
    },
    danger: {
      icon: AlertCircle,
      bgClass: 'bg-red-50 border-red-300',
      textClass: 'text-red-800',
      label: '危险'
    }
  }[level];

  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${config.bgClass} ${config.textClass} border`}
        title={reasons?.join(', ')}
      >
        <Icon size={10} />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${config.bgClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={config.textClass} />
        <span className={`font-medium text-sm ${config.textClass}`}>{config.label}</span>
      </div>
      {reasons && reasons.length > 0 && (
        <ul className="text-xs space-y-0.5 ml-6">
          {reasons.map((reason, idx) => (
            <li key={idx} className={config.textClass}>• {reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}