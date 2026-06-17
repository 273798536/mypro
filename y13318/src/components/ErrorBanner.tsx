import { X } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';

export function ErrorBanner() {
  const error = useReviewStore((s) => s.error);
  const setError = useReviewStore((s) => s.setError);
  if (!error) return null;
  return (
    <div className="fixed right-4 top-4 z-50 max-w-md animate-slidein border border-fail/50 bg-graphite-850/95 shadow-glow backdrop-blur">
      <div className="flex items-start gap-3 p-3">
        <span className="mt-1.5 h-2 w-2 animate-pulsebar bg-fail" />
        <div className="font-mono text-xs leading-relaxed">
          <div className="font-bold text-fail">{error.code}</div>
          <div className="text-zinc-300">{error.message}</div>
        </div>
        <button
          onClick={() => setError(null)}
          className="ml-auto text-zinc-500 transition-colors hover:text-zinc-200"
          aria-label="关闭错误"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
