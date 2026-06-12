import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface AlertProps {
  type: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  message: string;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type, title, message, className = '' }) => {
  const configs = {
    info: {
      icon: Info,
      bgColor: 'bg-alert-cyan/10',
      borderColor: 'border-alert-cyan/30',
      textColor: 'text-alert-cyan',
      titleColor: 'text-alert-cyan',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-alert-yellow/10',
      borderColor: 'border-alert-yellow/30',
      textColor: 'text-deep-sea-100',
      titleColor: 'text-alert-yellow',
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-alert-green/10',
      borderColor: 'border-alert-green/30',
      textColor: 'text-deep-sea-100',
      titleColor: 'text-alert-green',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-alert-red/10',
      borderColor: 'border-alert-red/30',
      textColor: 'text-deep-sea-100',
      titleColor: 'text-alert-red',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.titleColor}`} />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-medium mb-1 ${config.titleColor}`}>{title}</h4>
          )}
          <p className={`text-sm ${config.textColor}`}>{message}</p>
        </div>
      </div>
    </div>
  );
};
