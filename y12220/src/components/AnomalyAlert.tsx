import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

export type AnomalySeverity = 'info' | 'warning' | 'error' | 'critical';
export type AnomalyType = 'price' | 'route' | 'passenger' | 'document' | 'other';

interface AnomalyAlertProps {
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  affectedResult: string;
  amountImpact: string;
  ruleBasis: string;
  collapsible?: boolean;
  className?: string;
  onClose?: () => void;
}

const severityConfig: Record<
  AnomalySeverity,
  {
    icon: LucideIcon;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    labelColor: string;
    label: string;
  }
> = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    labelColor: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    label: '提示',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
    labelColor: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    label: '警告',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
    labelColor: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    label: '错误',
  },
  critical: {
    icon: XCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-300 dark:border-red-700',
    iconColor: 'text-red-700 dark:text-red-400',
    labelColor: 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200',
    label: '严重',
  },
};

const typeLabels: Record<AnomalyType, string> = {
  price: '价格异常',
  route: '航线异常',
  passenger: '旅客异常',
  document: '单证异常',
  other: '其他异常',
};

export default function AnomalyAlert({
  type,
  severity,
  title,
  description,
  affectedResult,
  amountImpact,
  ruleBasis,
  collapsible = true,
  className,
  onClose,
}: AnomalyAlertProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bgColor,
        config.borderColor,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={cn('w-5 h-5', config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              {title}
            </h4>
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                config.labelColor
              )}
            >
              {config.label}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {typeLabels[type]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {description}
          </p>
          {isExpanded && (
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  影响结果：
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {affectedResult}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  金额影响：
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {amountImpact}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  规则依据：
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {ruleBasis}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {collapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label={isExpanded ? '收起' : '展开'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="关闭"
            >
              <XCircle className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
