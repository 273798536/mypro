import { useToastStore, ToastType } from '@/store/useToastStore'
import { CheckCircle, XCircle, Loader2, Info, X, AlertTriangle } from 'lucide-react'

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  loading: Loader2,
  info: Info,
  warning: AlertTriangle,
}

const colorMap: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  loading: 'text-amber-400',
  info: 'text-blue-400',
  warning: 'text-amber-400',
}

const bgMap: Record<ToastType, string> = {
  success: 'bg-emerald-400/10 border-emerald-400/30',
  error: 'bg-red-400/10 border-red-400/30',
  loading: 'bg-amber-400/10 border-amber-400/30',
  info: 'bg-blue-400/10 border-blue-400/30',
  warning: 'bg-amber-400/10 border-amber-400/30',
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type]
        const isLoading = toast.type === 'loading'
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-md bg-zinc-900/95 ${bgMap[toast.type]} min-w-[280px] max-w-[360px] shadow-xl animate-[slideIn_0.3s_ease-out]`}
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            <Icon
              size={18}
              className={`shrink-0 mt-0.5 ${colorMap[toast.type]} ${isLoading ? 'animate-spin' : ''}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 leading-tight">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{toast.description}</p>
              )}
            </div>
            {!isLoading && (
              <button
                onClick={() => removeToast(toast.id)}
                className="p-0.5 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
