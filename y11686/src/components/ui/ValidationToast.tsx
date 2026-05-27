import { useState, useEffect } from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/store';
import { getErrorColor, getErrorIcon } from '@/utils/validation';

export function ValidationToast() {
  const { validationResult } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleErrors, setVisibleErrors] = useState<typeof validationResult>(null);

  useEffect(() => {
    if (validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0)) {
      setVisibleErrors(validationResult);
      setIsExpanded(true);
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setVisibleErrors(null);
    }
  }, [validationResult]);

  if (!visibleErrors || (visibleErrors.errors.length === 0 && visibleErrors.warnings.length === 0)) {
    return null;
  }

  const hasErrors = visibleErrors.errors.length > 0;
  const hasWarnings = visibleErrors.warnings.length > 0;
  const totalIssues = visibleErrors.errors.length + visibleErrors.warnings.length;

  return (
    <div
      className={`fixed top-20 right-4 z-50 w-96 panel ${
        hasErrors ? 'border-red-500/50' : 'border-warning-500/50'
      } transition-all duration-300`}
    >
      <div
        className={`panel-header flex items-center justify-between cursor-pointer ${
          hasErrors ? 'bg-red-500/20' : 'bg-warning-500/20'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={18}
            className={hasErrors ? 'text-red-400' : 'text-warning-400'}
          />
          <span className="font-medium">
            检测到 {totalIssues} 个问题
            {hasErrors && ` (${visibleErrors.errors.length} 个错误)`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-1 hover:bg-white/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setVisibleErrors(null);
            }}
          >
            <X size={14} />
          </button>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div className="panel-content max-h-80 overflow-y-auto space-y-3">
          {hasErrors && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-red-400 uppercase tracking-wide">
                错误 ({visibleErrors.errors.length})
              </h4>
              {visibleErrors.errors.map((error, index) => (
                <div
                  key={`error-${index}`}
                  className="p-3 bg-red-500/10 rounded-lg border border-red-500/30"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getErrorIcon(error.type)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">{error.message}</p>
                      <p className="text-xs text-white/60">{error.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasWarnings && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-warning-400 uppercase tracking-wide">
                警告 ({visibleErrors.warnings.length})
              </h4>
              {visibleErrors.warnings.map((warning, index) => (
                <div
                  key={`warning-${index}`}
                  className="p-3 bg-warning-500/10 rounded-lg border border-warning-500/30"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getErrorIcon(warning.type)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">{warning.message}</p>
                      <p className="text-xs text-white/60">{warning.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
