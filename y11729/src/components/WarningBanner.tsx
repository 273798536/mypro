import React from 'react';
import { AlertTriangle, XCircle, Info } from 'lucide-react';
import type { Warning } from '../physics';

interface WarningBannerProps {
  warnings: Warning[];
}

export const WarningBanner: React.FC<WarningBannerProps> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {warnings.map((warning, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg border flex items-start gap-3 ${
            warning.severity === 'error'
              ? 'bg-red-900/30 border-red-500/50 text-red-300'
              : 'bg-amber-900/30 border-amber-500/50 text-amber-300'
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {warning.severity === 'error' ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{warning.message}</p>
            {warning.suggestion && (
              <p className="text-xs mt-1 opacity-80 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {warning.suggestion}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
