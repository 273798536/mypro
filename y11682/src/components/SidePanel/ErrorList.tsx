import { AlertTriangle, X, Clock, MapPin, Database, Globe } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getErrorTypeLabel, formatErrorLocation } from '../../utils/validation';
import { ErrorType } from '../../types';

const typeIcons: Record<ErrorType, React.ReactNode> = {
  timezone: <Globe size={14} />,
  clipping: <MapPin size={14} />,
  gap: <Clock size={14} />,
  data: <Database size={14} />
};

const severityColors = {
  error: 'bg-red-500/20 border-red-500/50 text-red-400',
  warning: 'bg-amber-500/20 border-amber-500/50 text-amber-400'
};

export function ErrorList() {
  const { errors, dismissError } = useAppStore();

  if (errors.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm">暂无检测到的问题</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {errors.map((error) => (
        <div
          key={error.id}
          className={`p-3 rounded-lg border ${severityColors[error.severity]} relative`}
        >
          <button
            onClick={() => dismissError(error.id)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 transition-colors"
            title="忽略此问题"
          >
            <X size={14} />
          </button>
          
          <div className="flex items-start gap-2">
            <div className="mt-0.5">
              {typeIcons[error.type]}
            </div>
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {getErrorTypeLabel(error.type)}
                </span>
                <span className="text-xs opacity-70">
                  {error.severity === 'error' ? '错误' : '警告'}
                </span>
              </div>
              <p className="text-xs opacity-90 mb-2">
                {error.message}
              </p>
              <div className="text-xs font-mono opacity-60">
                {formatErrorLocation(error)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
