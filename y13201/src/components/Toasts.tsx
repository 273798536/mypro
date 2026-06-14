import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export default function Toasts() {
  const { toasts, removeToast } = useAppStore()
  return (
    <div className="fixed top-5 right-5 z-[100] space-y-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'error'
              ? AlertCircle
              : Info
        const color =
          t.type === 'success'
            ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10'
            : t.type === 'error'
              ? 'text-rose-400 border-rose-400/30 bg-rose-500/10'
              : 'text-sky-400 border-sky-400/30 bg-sky-500/10'
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto glass-card rounded-lg px-4 py-3 flex items-center gap-3 border min-w-[280px] shadow-xl',
              color,
              'animate-fade-in-up',
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-sm text-white/90 flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
