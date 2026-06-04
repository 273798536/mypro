import { X, AlertCircle, Lightbulb } from 'lucide-react';
import type { AppError } from '../types';

interface ErrorToastProps {
  errors: AppError[];
  onClose: (id: string) => void;
}

const ErrorToast = ({ errors, onClose }: ErrorToastProps) => {
  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {errors.map((error) => (
        <div
          key={error.id}
          className="glass-card p-4 w-96 animate-[slideIn_0.3s_ease-out]"
          style={{
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-danger/20 text-danger flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{error.message}</p>
              
              <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-warning-light">{error.actionable}</p>
              </div>
            </div>
            
            <button
              onClick={() => onClose(error.id)}
              className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ErrorToast;
