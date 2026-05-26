import { AlertTriangle, Info } from 'lucide-react';
import type { ValidationError } from '../../types';

interface ErrorDisplayProps {
  errors: ValidationError[];
}

export default function ErrorDisplay({ errors }: ErrorDisplayProps) {
  if (errors.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
        <Info size={16} className="text-green-400" />
        <span>所有参数验证通过</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {errors.map((error, index) => (
        <div
          key={index}
          className={`p-2 rounded text-xs ${
            error.severity === 'error'
              ? 'bg-red-900/30 border border-red-500/50'
              : 'bg-yellow-900/30 border border-yellow-500/50'
          }`}
        >
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle
              size={12}
              className={error.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}
            />
            <span
              className={`font-medium ${
                error.severity === 'error' ? 'text-red-300' : 'text-yellow-300'
              }`}
            >
              {error.severity === 'error' ? '错误' : '警告'}
            </span>
          </div>
          <div className="text-gray-300 mb-1">{error.message}</div>
          <div className="text-gray-500 text-xs">{error.suggestion}</div>
        </div>
      ))}
    </div>
  );
}
