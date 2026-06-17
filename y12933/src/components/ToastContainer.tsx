import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useUiStore } from '@/store/useUi'
import { cn } from '@/lib/utils'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const COLORS = {
  success: 'border-pass/30 text-pass',
  error: 'border-reject/30 text-reject',
  info: 'border-white/15 text-zinc-200',
}

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-ink-800/95 px-3.5 py-2.5 shadow-panel backdrop-blur animate-rise',
              COLORS[t.kind],
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1 text-sm text-zinc-100">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-zinc-500 transition hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
