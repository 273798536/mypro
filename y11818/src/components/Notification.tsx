import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/hooks/useStore'
import type { Notification } from '@/hooks/useStore'

interface NotificationProps {
  notification: Notification
  onClose: () => void
}

export default function Notification({ notification, onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const config = {
    success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
    warning: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  }[notification.type]

  const Icon = config.icon

  return (
    <div className={cn('flex w-80 rounded-lg border p-4 shadow-lg backdrop-blur', config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 shrink-0', config.color)} />
        <p className="flex-1 text-sm text-soft-white">{notification.message}</p>
        <button onClick={onClose} className="text-soft-white/40 hover:text-soft-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
