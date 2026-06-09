import type { Anomaly, AnomalySeverity } from '@/types';
import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnomalyBadgeProps {
  anomaly: Anomaly;
  showDetail?: boolean;
  onClick?: () => void;
}

const severityConfig: Record<AnomalySeverity, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  label: string;
  Icon: typeof AlertTriangle;
}> = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    iconBg: 'bg-amber-500',
    label: '警告',
    Icon: AlertTriangle,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    iconBg: 'bg-red-500',
    label: '错误',
    Icon: AlertCircle,
  },
  critical: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-900',
    iconBg: 'bg-red-700',
    label: '严重',
    Icon: XCircle,
  },
};

const typeLabels: Record<string, string> = {
  ph_out_of_range: 'pH值越界',
  concentration_error: '浓度异常',
  temperature_abnormal: '温度异常',
  formula_error: '化学式错误',
};

export default function AnomalyBadge({ anomaly, showDetail = false, onClick }: AnomalyBadgeProps) {
  const config = severityConfig[anomaly.severity];
  const Icon = config.Icon;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        config.bg,
        config.border,
        onClick && 'cursor-pointer hover:shadow-md'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white', config.iconBg)}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-semibold text-sm', config.text)}>
              {typeLabels[anomaly.type] || '数据异常'}
            </span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', config.iconBg, 'text-white')}>
              {config.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-700">{anomaly.userFriendlyMessage}</p>
          {showDetail && (
            <div className="mt-2 text-xs text-gray-500">
              <span>实际值：{anomaly.actualValue}</span>
              {(anomaly.expectedMin !== undefined || anomaly.expectedMax !== undefined) && (
                <span className="ml-2">
                  期望范围：[{anomaly.expectedMin ?? '-∞'}, {anomaly.expectedMax ?? '+∞'}]
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
