import React from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationError } from '@/types';

interface AlertBannerProps {
  errors: ValidationError[];
  onDismiss?: (id: string) => void;
  className?: string;
}

const errorIcons = {
  color_reversal: <AlertTriangle className="w-4 h-4" />,
  trajectory_overlap: <AlertCircle className="w-4 h-4" />,
  accident_missing: <AlertTriangle className="w-4 h-4" />,
  data_inconsistency: <Info className="w-4 h-4" />,
};

const errorTypeLabels: Record<string, string> = {
  color_reversal: '坡度颜色异常',
  trajectory_overlap: '轨迹重叠风险',
  accident_missing: '事故点漏筛',
  data_inconsistency: '数据不一致',
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  errors,
  onDismiss,
  className,
}) => {
  if (errors.length === 0) return null;

  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/30 backdrop-blur-sm',
        className
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {errorCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errorCount} 错误
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {warningCount} 警告
                </span>
              )}
            </div>
            <span className="text-sm text-white/80">
              发现 {errors.length} 项数据异常，请查看详情
            </span>
          </div>
          <span className="text-xs text-white/50">
            点击查看详细信息
          </span>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-h-32 overflow-y-auto">
          {errors.map((error) => (
            <div
              key={error.id}
              className="flex items-start gap-3 px-4 py-2 hover:bg-white/5 border-b border-white/5 last:border-b-0"
            >
              <span
                className={cn(
                  'mt-0.5',
                  error.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                )}
              >
                {errorIcons[error.type] || <AlertCircle className="w-4 h-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/90">
                    {errorTypeLabels[error.type] || '数据异常'}
                  </span>
                  <span className="text-xs text-white/40">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-0.5">{error.message}</p>
                <p className="text-xs text-white/40 mt-0.5">{error.details}</p>
              </div>
              {onDismiss && (
                <button
                  onClick={() => onDismiss(error.id)}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
