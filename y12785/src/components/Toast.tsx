import { X, AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/store'

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const styleMap = {
  success: 'bg-emerald-500/10 border-emerald-500 text-emerald-500',
  error: 'bg-coral-500/10 border-coral-500 text-coral-500',
  warning: 'bg-amber-500/10 border-amber-500 text-amber-500',
  info: 'bg-blue-100 border-blue-500 text-blue-700',
}

export default function Toast() {
  const { toasts, removeToast } = useAppStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type]
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg bg-white animate-slide-in`}
          >
            <Icon size={18} className={`flex-shrink-0 mt-0.5 ${styleMap[toast.type].split(' ').pop()}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">{toast.message}</p>
              {toast.actionableHint && (
                <p className="text-xs text-amber-500 mt-1 font-medium">
                  {toast.actionableHint}
                </p>
              )}
              {toast.missingData && toast.missingData.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {toast.missingData.map((item, i) => (
                    <li key={i} className="text-xs text-coral-500 font-mono">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-cool-gray hover:text-gray-600 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
