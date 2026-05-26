import type { ValidationError } from '@/types/trajectory';
import { formatSource, getSeverityColor } from '@/utils/errorFormatter';
import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

interface Props {
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function ValidationAlert({ errors, warnings }: Props) {
  const all = [...errors, ...warnings];
  if (all.length === 0) return null;

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle size={14} className="text-golf-critical flex-shrink-0" />;
      case 'error':
        return <AlertCircle size={14} className="text-golf-error flex-shrink-0" />;
      default:
        return <AlertTriangle size={14} className="text-golf-warn flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-2 animate-fade-in">
      {all.map((err, idx) => (
        <div
          key={`${err.code}-${idx}`}
          className="p-3 rounded-lg border"
          style={{
            borderColor: getSeverityColor(err.severity),
            background: `${getSeverityColor(err.severity)}15`,
          }}
        >
          <div className="flex items-start gap-2">
            {getIcon(err.severity)}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: getSeverityColor(err.severity) }}>
                {err.message}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                来源: {formatSource(err.source.lineNumber, err.source.origin)}
              </div>
              <div className="text-xs text-gray-300 mt-1 italic">
                💡 {err.suggestion}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
