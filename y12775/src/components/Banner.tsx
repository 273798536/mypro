import { AlertTriangle, Info, X } from 'lucide-react';

export type BannerType = 'warning' | 'info' | 'error' | 'success';

interface BannerProps {
  type: BannerType;
  title: string;
  message?: string;
  details?: string;
  onClose?: () => void;
  expandable?: boolean;
}

const configs: Record<BannerType, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  icon: typeof AlertTriangle;
}> = {
  warning: {
    bg: 'bg-status-reviewBg',
    border: 'border-status-review/20',
    text: 'text-status-review',
    iconBg: 'bg-status-review/10',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-primary-50',
    border: 'border-primary-200',
    text: 'text-primary-800',
    iconBg: 'bg-primary-100',
    icon: Info,
  },
  error: {
    bg: 'bg-status-failBg',
    border: 'border-status-fail/20',
    text: 'text-status-fail',
    iconBg: 'bg-status-fail/10',
    icon: X,
  },
  success: {
    bg: 'bg-status-passBg',
    border: 'border-status-pass/20',
    text: 'text-status-pass',
    iconBg: 'bg-status-pass/10',
    icon: Info,
  },
};

export function Banner({
  type,
  title,
  message,
  details,
  onClose,
  expandable,
}: BannerProps) {
  const cfg = configs[type];
  const Icon = cfg.icon;

  return (
    <div
      className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 transition-all duration-300`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4.5 h-4.5 ${cfg.text}`} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${cfg.text}`}>{title}</p>
          {message && (
            <p className={`mt-1 text-sm ${cfg.text} opacity-80`}>{message}</p>
          )}
          {expandable && details && (
            <details className="mt-2">
              <summary className={`text-xs ${cfg.text} cursor-pointer hover:underline font-medium`}>
                查看详细说明
              </summary>
              <div className={`mt-2 text-xs ${cfg.text} opacity-75 space-y-1 whitespace-pre-line`}>
                {details}
              </div>
            </details>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-1 rounded-md hover:bg-black/5 shrink-0 transition-colors ${cfg.text}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
