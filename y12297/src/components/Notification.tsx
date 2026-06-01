import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const typeConfig = {
  success: {
    icon: '✓',
    borderColor: 'border-trust-500',
    textColor: 'text-trust-500',
  },
  error: {
    icon: '✕',
    borderColor: 'border-risk-500',
    textColor: 'text-risk-500',
  },
  warning: {
    icon: '⚠',
    borderColor: 'border-warning-500',
    textColor: 'text-warning-500',
  },
} as const;

export default function Notification() {
  const notification = useAppStore((state) => state.notification);

  if (!notification) return null;

  const { message, type } = notification;
  const config = typeConfig[type];

  return (
    <div
      className={cn(
        'fixed top-6 right-6 z-50 w-[320px] rounded-xl',
        'bg-white/10 backdrop-blur-xl',
        'border border-white/20 border-l-4',
        config.borderColor,
        'shadow-2xl',
        'animate-slide-in-right'
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={cn(
            'text-xl font-bold leading-none',
            config.textColor
          )}
        >
          {config.icon}
        </span>
        <p className="text-white/90 text-sm leading-relaxed flex-1 pt-0.5">
          {message}
        </p>
      </div>
    </div>
  );
}
