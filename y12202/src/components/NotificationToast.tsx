import useStore from '@/store/app'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NotificationToast() {
  const { notifications, removeNotification } = useStore()

  const typeConfig: Record<string, { icon: React.ReactNode; bg: string; border: string }> = {
    success: {
      icon: <CheckCircle size={20} className="text-emerald-500" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    error: {
      icon: <XCircle size={20} className="text-red-500" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    warning: {
      icon: <AlertTriangle size={20} className="text-amber-500" />,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    info: {
      icon: <Info size={20} className="text-blue-500" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => {
        const config = typeConfig[notification.type] || typeConfig.info
        return (
          <div
            key={notification.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-fade-in min-w-72',
              config.bg,
              config.border
            )}
          >
            {config.icon}
            <p className="flex-1 text-sm text-slate-700">{notification.message}</p>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
