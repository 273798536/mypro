import { AlertTriangle, X } from 'lucide-react';
import type { ProcessError } from '@/types';

interface ErrorAlertProps {
  error: ProcessError;
  onDismiss?: () => void;
}

export default function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  return (
    <div className="bg-fail-light/30 border border-fail/30 text-fail rounded-lg p-4 flex gap-3 items-start fade-in">
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{error.userMessage}</p>
        {error.suggestion && (
          <p className="text-sm text-ink-muted mt-1">{error.suggestion}</p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-fail/10 transition-colors"
          aria-label="关闭错误提示"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
