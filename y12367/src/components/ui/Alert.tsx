import * as React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnomalyType } from '@/types';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'anomaly';
  anomalyType?: AnomalyType;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', anomalyType, title, children, dismissible, onDismiss, ...props }, ref) => {
    const variants = {
      info: {
        bg: 'bg-blue-500/10 border-blue-500/30',
        text: 'text-blue-400',
        icon: Info,
      },
      success: {
        bg: 'bg-green-500/10 border-green-500/30',
        text: 'text-green-400',
        icon: CheckCircle,
      },
      warning: {
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        text: 'text-yellow-400',
        icon: AlertTriangle,
      },
      danger: {
        bg: 'bg-red-500/10 border-red-500/30',
        text: 'text-red-400',
        icon: AlertCircle,
      },
      anomaly: {
        bg: anomalyType === 'speed_missing'
          ? 'bg-blue-500/10 border-blue-500/30'
          : anomalyType === 'temp_overlimit'
          ? 'bg-orange-500/10 border-orange-500/30'
          : 'bg-red-500/10 border-red-500/30',
        text: anomalyType === 'speed_missing'
          ? 'text-blue-400'
          : anomalyType === 'temp_overlimit'
          ? 'text-orange-400'
          : 'text-red-400',
        icon: AlertCircle,
      },
    };

    const config = variants[variant];
    const Icon = config.icon;

    return (
      <div
        ref={ref}
        className={cn('border rounded-sm p-4 flex items-start gap-3', config.bg, className)}
        {...props}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.text)} />
        <div className="flex-1 min-w-0">
          {title && <h4 className={cn('font-medium mb-1', config.text)}>{title}</h4>}
          <div className={cn('text-sm', config.text)}>{children}</div>
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn('p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0', config.text)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
