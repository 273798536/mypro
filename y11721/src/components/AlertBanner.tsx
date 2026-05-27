import { AlertTriangle, XCircle, Info } from 'lucide-react';
import { useSolarStore } from '../store/solarStore';

export function AlertBanner() {
  const errors = useSolarStore(state => state.validationErrors);

  if (errors.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 z-20 space-y-2 max-w-md">
      {errors.map((error, index) => (
        <div
          key={index}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg backdrop-blur-sm border ${
            error.type === 'error'
              ? 'bg-red-900/80 border-red-600 text-red-100'
              : 'bg-yellow-900/80 border-yellow-600 text-yellow-100'
          }`}
        >
          {error.type === 'error' ? (
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="text-sm font-medium">
              {error.type === 'error' ? '参数错误' : '警告'}
            </div>
            <div className="text-xs opacity-90 mt-0.5">
              {error.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
