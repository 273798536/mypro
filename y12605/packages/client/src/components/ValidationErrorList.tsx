import type { ValidationError } from '@puzzle/shared';

interface ValidationErrorListProps {
  errors: ValidationError[];
}

export default function ValidationErrorList({ errors }: ValidationErrorListProps) {
  if (!errors || errors.length === 0) {
    return null;
  }

  const isConsistencyError = (field: string) => {
    return field === 'scoreSheet' || field === 'conclusion';
  };

  return (
    <div className="space-y-3">
      {errors.map((error, index) => {
        const isWarning = isConsistencyError(error.field);
        const borderColor = isWarning ? 'border-amber-400' : 'border-red-400';
        const bgColor = isWarning ? 'bg-amber-50' : 'bg-red-50';
        const textColor = isWarning ? 'text-amber-800' : 'text-red-800';
        const iconColor = isWarning ? 'text-amber-500' : 'text-red-500';

        return (
          <div
            key={index}
            className={`p-4 rounded-lg border-l-4 ${borderColor} ${bgColor}`}
          >
            <div className="flex items-start gap-3">
              <svg className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <div className={`font-medium ${textColor}`}>
                  <span className="font-bold">[{error.field}]</span> {error.message}
                </div>
                {error.suggestion && (
                  <div className="text-sm text-slate-500 mt-1">
                    建议：{error.suggestion}
                  </div>
                )}
                {error.missingMaterials && error.missingMaterials.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-slate-700">缺失的素材：</div>
                    <ul className="text-sm text-slate-600 list-disc list-inside mt-1">
                      {error.missingMaterials.map((material, idx) => (
                        <li key={idx}>{material}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
