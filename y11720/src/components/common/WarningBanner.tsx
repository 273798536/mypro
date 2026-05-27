import { AlertTriangle, XCircle } from 'lucide-react';
import type { Warning } from '../../types';

interface WarningBannerProps {
  warnings: Warning[];
}

export default function WarningBanner({ warnings }: WarningBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((warning, index) => {
        const isError = warning.severity === 'error';
        return (
          <div
            key={index}
            className={`p-4 rounded-lg border animate-fade-in-up ${
              isError
                ? 'bg-red-50 border-red-200'
                : 'bg-warning-50 border-warning-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {isError ? (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${isError ? 'text-red-800' : 'text-warning-800'}`}>
                  {warning.message}
                </p>
                <p className={`text-sm mt-1 ${isError ? 'text-red-600' : 'text-warning-600'}`}>
                  {warning.suggestion}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
