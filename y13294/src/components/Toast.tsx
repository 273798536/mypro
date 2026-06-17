import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Toast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-sm animate-fade-up items-start gap-3 rounded-lg border border-accent/30 bg-surface p-3 shadow-card">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-processed" />
      <p className="text-sm leading-snug text-ink">{message}</p>
      <button
        onClick={onClose}
        className={cn('ml-auto -mr-1 -mt-1 rounded p-1 text-muted hover:bg-paper')}
        aria-label="关闭"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
