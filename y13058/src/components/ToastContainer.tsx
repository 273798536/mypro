import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore, type ToastType } from '@/hooks/useToast'

const typeConfig: Record<ToastType, { bg: string; border: string; Icon: typeof CheckCircle2 }> = {
  success: { bg: 'bg-emerald-50', border: 'border-success-500/50', Icon: CheckCircle2 },
  error: { bg: 'bg-red-50', border: 'border-red-500/50', Icon: AlertCircle },
  info: { bg: 'bg-engineer-50', border: 'border-engineer-500/50', Icon: Info },
  warning: { bg: 'bg-orange-50', border: 'border-warn-500/50', Icon: AlertTriangle },
}

const typeIconColor: Record<ToastType, string> = {
  success: 'text-success-500',
  error: 'text-red-500',
  info: 'text-engineer-500',
  warning: 'text-warn-500',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed right-6 top-6 z-50 space-y-3 w-80">
      {toasts.map((toast) => {
        const cfg = typeConfig[toast.type]
        const { Icon } = cfg
        return (
          <div
            key={toast.id}
            className={`${cfg.bg} ${cfg.border} border rounded-lg p-3.5 shadow-lg flex items-start gap-3 animate-[slideIn_0.25s_ease-out]`}
            style={{ animation: 'slideIn 0.25s ease-out' }}
          >
            <Icon className={`w-5 h-5 ${typeIconColor[toast.type]} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 text-sm text-engineer-800 leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-engineer-400 hover:text-engineer-600 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
