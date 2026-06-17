import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';

type AlertType = 'danger' | 'warning' | 'info' | 'success';

interface AlertBarProps {
  type?: AlertType;
  message: string;
  actionText?: string;
  onAction?: () => void;
  onClose?: () => void;
}

const typeConfig: Record<
  AlertType,
  {
    bg: string;
    border: string;
    text: string;
    iconText: string;
    Icon: React.ComponentType<{ className?: string }>;
    buttonBg: string;
    buttonText: string;
    buttonHover: string;
  }
> = {
  danger: {
    bg: 'bg-danger-50 animate-breathe-bg',
    border: 'border-danger-200',
    text: 'text-danger-800',
    iconText: 'text-danger',
    Icon: AlertCircle,
    buttonBg: 'bg-danger',
    buttonText: 'text-white',
    buttonHover: 'hover:bg-danger-700',
  },
  warning: {
    bg: 'bg-warning-50',
    border: 'border-warning-200',
    text: 'text-warning-800',
    iconText: 'text-warning',
    Icon: AlertTriangle,
    buttonBg: 'bg-warning',
    buttonText: 'text-white',
    buttonHover: 'hover:bg-warning-700',
  },
  info: {
    bg: 'bg-industrial-50',
    border: 'border-industrial-200',
    text: 'text-industrial-800',
    iconText: 'text-industrial',
    Icon: Info,
    buttonBg: 'bg-industrial',
    buttonText: 'text-white',
    buttonHover: 'hover:bg-industrial-700',
  },
  success: {
    bg: 'bg-success-50',
    border: 'border-success-200',
    text: 'text-success-800',
    iconText: 'text-success',
    Icon: CheckCircle2,
    buttonBg: 'bg-success',
    buttonText: 'text-white',
    buttonHover: 'hover:bg-success-700',
  },
};

const AlertBar = ({
  type = 'info',
  message,
  actionText,
  onAction,
  onClose,
}: AlertBarProps) => {
  const config = typeConfig[type];
  const { Icon } = config;

  return (
    <div
      className={`relative flex items-center gap-4 px-4 py-3 rounded-xl border ${config.bg} ${config.border} ${config.text}`}
    >
      <div className="flex-shrink-0">
        <Icon className={`w-5 h-5 ${config.iconText}`} />
      </div>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {actionText && onAction && (
          <button
            onClick={onAction}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${config.buttonBg} ${config.buttonText} ${config.buttonHover}`}
          >
            {actionText}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/50 ${config.iconText}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertBar;
