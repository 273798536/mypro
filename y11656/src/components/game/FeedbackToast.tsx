import type { ToastMessage } from '@/types';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

interface FeedbackToastProps {
  toasts: ToastMessage[];
  onDismiss?: (id: string) => void;
}

const icons = {
  success: <CheckCircle className="text-green-500" size={24} />,
  error: <XCircle className="text-red-500" size={24} />,
  warning: <AlertTriangle className="text-yellow-500" size={24} />,
};

const bgColors = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-yellow-50 border-yellow-200',
};

export function FeedbackToast({ toasts, onDismiss }: FeedbackToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 p-4 rounded-lg border shadow-lg
            animate-slide-in ${bgColors[toast.type]}
          `}
        >
          {icons[toast.type]}
          <div className="flex-1">
            <h4 className="font-semibold text-amber-900">{toast.title}</h4>
            <p className="text-sm text-amber-700 mt-1">{toast.message}</p>
          </div>
          {onDismiss && (
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-amber-400 hover:text-amber-600 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
