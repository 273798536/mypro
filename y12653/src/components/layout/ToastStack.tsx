import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const toastConfig = {
  success: {
    icon: CheckCircle,
    cls: 'border-accent-green/30',
    iconCls: 'text-accent-green',
  },
  error: {
    icon: XCircle,
    cls: 'border-accent-red/30',
    iconCls: 'text-accent-red',
  },
  warning: {
    icon: AlertTriangle,
    cls: 'border-accent-yellow/30',
    iconCls: 'text-accent-yellow',
  },
  info: {
    icon: Info,
    cls: 'border-steel-300/30',
    iconCls: 'text-steel-100',
  },
};

export default function ToastStack() {
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => {
        const cfg = toastConfig[t.type];
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className={cn(
              'glass flex items-start gap-3 p-3 animate-in fade-in slide-in-from-top-2',
              cfg.cls
            )}
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', cfg.iconCls)} />
            <p className="flex-1 text-sm text-steel-100 leading-relaxed">{t.msg}</p>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-steel-300 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
