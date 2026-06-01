import type { CalculationWarning } from '../../shared/types';
import { AlertTriangle, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WarningBadgeProps {
  warning: CalculationWarning;
  versionId?: string;
  showTrace?: boolean;
}

const severityConfig = {
  error: {
    badge: 'badge-error',
    icon: AlertCircle,
    border: 'error-border',
    bg: 'bg-red-50',
    text: 'text-red-800',
  },
  warning: {
    badge: 'badge-warning',
    icon: AlertTriangle,
    border: 'warning-border',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
  },
  info: {
    badge: 'badge-info',
    icon: Info,
    border: 'info-border',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
  },
};

const typeLabels: Record<string, string> = {
  expired_tariff: '电价表过期',
  negative_usage: '用量为负',
  boundary_tier: '边界档位',
  mismatch_total: '总量不匹配',
  tariff_boundary: '最高档位',
};

export function WarningBadge({ warning, versionId, showTrace = true }: WarningBadgeProps) {
  const config = severityConfig[warning.severity];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} rounded-md p-3`}>
      <div className="flex items-start gap-3">
        <div className={`${config.text} mt-0.5`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${config.badge}`}>
              {typeLabels[warning.type] || warning.type}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {warning.sourceField}
            </span>
          </div>
          <p className={`text-sm ${config.text}`}>{warning.message}</p>
          {showTrace && versionId && (
            <Link
              to={`/trace/${versionId}?warning=${warning.traceId}`}
              className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${config.text} hover:underline`}
            >
              追溯来源 <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

interface WarningListProps {
  warnings: CalculationWarning[];
  versionId?: string;
  showTrace?: boolean;
  className?: string;
}

export function WarningList({ warnings, versionId, showTrace, className = '' }: WarningListProps) {
  if (warnings.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 text-center">
        <span className="badge-success">无异常</span>
        <p className="text-sm text-emerald-700 mt-2">本次核算未检测到异常情况</p>
      </div>
    );
  }

  const errorCount = warnings.filter((w) => w.severity === 'error').length;
  const warningCount = warnings.filter((w) => w.severity === 'warning').length;
  const infoCount = warnings.filter((w) => w.severity === 'info').length;

  return (
    <div className={className}>
      <div className="flex items-center gap-4 mb-3">
        <h3 className="font-medium text-slate-800">异常检测</h3>
        <div className="flex items-center gap-2 text-sm">
          {errorCount > 0 && <span className="badge-error">{errorCount} 项错误</span>}
          {warningCount > 0 && <span className="badge-warning">{warningCount} 项警告</span>}
          {infoCount > 0 && <span className="badge-info">{infoCount} 项提示</span>}
        </div>
      </div>
      <div className="space-y-2">
        {warnings.map((warning) => (
          <WarningBadge
            key={warning.traceId}
            warning={warning}
            versionId={versionId}
            showTrace={showTrace}
          />
        ))}
      </div>
    </div>
  );
}
