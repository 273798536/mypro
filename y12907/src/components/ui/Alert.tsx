import { AlertCircle, CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface AlertProps {
  type: AlertType;
  title: string;
  description?: string;
  className?: string;
}

// 警告提示组件
export const Alert: React.FC<AlertProps> = ({ type, title, description, className = '' }) => {
  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconColor: 'text-emerald-500',
      textColor: 'text-emerald-800'
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconColor: 'text-red-500',
      textColor: 'text-red-800'
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-500',
      textColor: 'text-amber-800'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-800'
    },
    loading: {
      icon: Loader2,
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      iconColor: 'text-gray-500 animate-spin',
      textColor: 'text-gray-800'
    }
  };

  const { icon: Icon, bg, border, iconColor, textColor } = config[type];

  return (
    <div className={`${bg} ${border} border rounded-lg p-4 ${className}`}>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${textColor}`}>{title}</p>
          {description && (
            <p className={`mt-1 text-sm ${textColor} opacity-80`}>{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};
