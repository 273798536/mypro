import { AlertTriangle, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useExperimentStore } from '../../store/useExperimentStore';
import { cn } from '../../utils/cn';

const ERROR_TYPE_LABELS: Record<string, string> = {
  momentum_gain: '动量异常',
  penetration: '球体穿透',
  param_out_of_bounds: '参数越界',
};

export function ErrorList() {
  const errors = useExperimentStore((state) => state.errors);
  const dismissError = useExperimentStore((state) => state.dismissError);
  const clearErrors = useExperimentStore((state) => state.clearErrors);

  const errorsByType = {
    error: errors.filter((e) => e.severity === 'error'),
    warning: errors.filter((e) => e.severity === 'warning'),
  };

  if (errors.length === 0) {
    return (
      <div className="bg-space-800 rounded-lg p-4 border border-space-700">
        <div className="flex items-center gap-2">
          <CheckCircle className="text-alert-green" size={18} />
          <span className="text-sm text-alert-green">系统运行正常，未检测到异常</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-space-800 rounded-lg border border-space-700 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-space-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-alert-orange" size={18} />
          <span className="text-sm font-medium">
            检测到 {errors.length} 个异常
            {errorsByType.error.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                {errorsByType.error.length} 错误
              </span>
            )}
            {errorsByType.warning.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                {errorsByType.warning.length} 警告
              </span>
            )}
          </span>
        </div>
        <button
          onClick={clearErrors}
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          清除全部
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto">
        {errors.map((error) => (
          <div
            key={error.id}
            className={cn(
              "px-4 py-3 border-b border-space-700/50 last:border-b-0",
              error.severity === 'error' && 'bg-red-500/5',
              error.severity === 'warning' && 'bg-yellow-500/5',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {error.severity === 'error' ? (
                    <AlertCircle className="text-red-400 flex-shrink-0" size={14} />
                  ) : (
                    <AlertTriangle className="text-yellow-400 flex-shrink-0" size={14} />
                  )}
                  <span className="text-xs font-medium">
                    {ERROR_TYPE_LABELS[error.type] || error.type}
                  </span>
                </div>
                <p className="text-sm text-white/80">{error.message}</p>
                <div className="mt-1 text-xs text-white/40 mono-text">
                  位置: {error.sourceLocation}
                </div>
                {error.ballIds.length > 0 && (
                  <div className="mt-1 text-xs text-white/40">
                    相关球体: {error.ballIds.join(', ')}
                  </div>
                )}
                {error.data && (
                  <div className="mt-1 text-xs text-white/50 mono-text">
                    数据: {JSON.stringify(error.data)}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismissError(error.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
