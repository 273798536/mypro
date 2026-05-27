import React from 'react';
import { AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { RiskDetection } from '../../types';
import { getRiskIcon } from '../../utils/riskDetection';

interface RiskAlertProps {
  risk: RiskDetection;
  onDismiss?: () => void;
}

export const RiskAlert: React.FC<RiskAlertProps> = ({ risk, onDismiss }) => {
  const severityStyles = {
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: 'text-amber-500',
      iconBg: 'bg-amber-100'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-500',
      iconBg: 'bg-red-100'
    }
  };

  const styles = severityStyles[risk.severity];

  return (
    <div className={cn(
      'rounded-lg border p-4',
      styles.bg,
      styles.border,
      'animate-in fade-in slide-in-from-top-2 duration-300'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg flex-shrink-0', styles.iconBg)}>
          {risk.severity === 'error' ? (
            <XCircle className={cn('w-5 h-5', styles.icon)} />
          ) : (
            <AlertTriangle className={cn('w-5 h-5', styles.icon)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getRiskIcon(risk.type)}</span>
            <h4 className={cn('font-medium', styles.text)}>
              {risk.severity === 'error' ? '严重问题' : '警告'}
            </h4>
          </div>
          <p className={cn('mt-1 text-sm', styles.text)}>
            {risk.message}
          </p>
          {risk.details && Object.keys(risk.details).length > 0 && (
            <div className="mt-2 text-xs text-gray-600 bg-white/50 rounded p-2">
              <span className="font-medium">详情：</span>
              <pre className="inline ml-1 whitespace-pre-wrap">
                {JSON.stringify(risk.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn('p-1 rounded hover:bg-white/50 transition-colors', styles.text)}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

interface RiskBannerProps {
  risks: RiskDetection[];
}

export const RiskBanner: React.FC<RiskBannerProps> = ({ risks }) => {
  if (risks.length === 0) return null;

  const hasError = risks.some(r => r.severity === 'error');
  const warningCount = risks.filter(r => r.severity === 'warning').length;
  const errorCount = risks.filter(r => r.severity === 'error').length;

  return (
    <div className={cn(
      'rounded-lg border p-4 mb-6',
      hasError ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          hasError ? 'bg-red-100' : 'bg-amber-100'
        )}>
          <AlertTriangle className={cn(
            'w-5 h-5',
            hasError ? 'text-red-500' : 'text-amber-500'
          )} />
        </div>
        <div className="flex-1">
          <p className={cn(
            'font-medium',
            hasError ? 'text-red-800' : 'text-amber-800'
          )}>
            检测到 {errorCount > 0 ? `${errorCount} 项严重问题` : ''}
            {errorCount > 0 && warningCount > 0 ? ' 和 ' : ''}
            {warningCount > 0 ? `${warningCount} 项警告` : ''}
          </p>
          <p className={cn(
            'text-sm mt-1',
            hasError ? 'text-red-600' : 'text-amber-600'
          )}>
            这些问题可能影响预测结果的准确性，请在下方查看详情。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Info className={cn(
            'w-5 h-5',
            hasError ? 'text-red-400' : 'text-amber-400'
          )} />
        </div>
      </div>
    </div>
  );
};
