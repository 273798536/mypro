import { useApp } from '@/lib/store';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/40 text-emerald-100',
  error: 'from-rose-500/20 to-rose-500/5 border-rose-500/40 text-rose-100',
  info: 'from-sky-500/20 to-sky-500/5 border-sky-500/40 text-sky-100',
};

export function ToastStack() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => {
        const Icon = ICONS[t.type];
        return (
          <div
            key={t.id}
            className={clsx(
              'flex items-start gap-3 px-3 py-2.5 rounded-lg border bg-gradient-to-br backdrop-blur shadow-lg anim-fade-up',
              COLORS[t.type],
            )}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm flex-1 leading-relaxed">{t.text}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="opacity-60 hover:opacity-100 transition shrink-0"
              aria-label="关闭"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
