import type { ValidationError } from '@/types';
import { getErrorTypeLabel } from '@/utils/validation';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface ErrorListProps {
  errors: ValidationError[];
  onErrorClick?: (error: ValidationError) => void;
  maxItems?: number;
}

export const ErrorList = ({ errors, onErrorClick, maxItems = 10 }: ErrorListProps) => {
  if (errors.length === 0) {
    return (
      <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-green/20 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-accent-green"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-accent-green font-medium">数据校验通过</p>
        <p className="text-sm text-primary-400 mt-1">所有参数完整，可以进行计算</p>
      </div>
    );
  }

  const displayErrors = errors.slice(0, maxItems);
  const remaining = errors.length - maxItems;

  return (
    <div className="space-y-2">
      {displayErrors.map((error) => {
        const isError = error.severity === 'error';
        return (
          <div
            key={error.id}
            onClick={() => onErrorClick?.(error)}
            className={`p-4 rounded-lg border transition-all cursor-pointer hover:translate-x-1 ${
              isError
                ? 'bg-accent-red/10 border-accent-red/30 hover:bg-accent-red/15'
                : 'bg-accent-orange/10 border-accent-orange/30 hover:bg-accent-orange/15'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${
                  isError ? 'bg-accent-red/20' : 'bg-accent-orange/20'
                }`}
              >
                {isError ? (
                  <AlertCircle className={isError ? 'text-accent-red' : 'text-accent-orange'} size={16} />
                ) : (
                  <AlertTriangle className={isError ? 'text-accent-red' : 'text-accent-orange'} size={16} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isError
                        ? 'bg-accent-red/20 text-accent-red'
                        : 'bg-accent-orange/20 text-accent-orange'
                    }`}
                  >
                    {getErrorTypeLabel(error.type)}
                  </span>
                  <span className="text-xs text-primary-500">
                    {error.source?.fileName && `文件: ${error.source.fileName}`}
                    {error.source?.lineNumber && ` · 第${error.source.lineNumber}行`}
                  </span>
                </div>
                <p className="text-sm text-white mb-1">{error.message}</p>
                {error.source?.frequencyBand && (
                  <span className="inline-block text-xs bg-primary-800 text-primary-300 px-2 py-0.5 rounded mr-2 mb-1">
                    频段: {error.source.frequencyBand}Hz
                  </span>
                )}
                <p className="text-xs text-primary-400 mt-1">
                  <span className="text-accent-green">建议：</span>
                  {error.suggestion}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      {remaining > 0 && (
        <p className="text-center text-sm text-primary-500 pt-2">
          还有 {remaining} 个问题未显示...
        </p>
      )}
    </div>
  );
};
