import { cn } from '@/lib/utils'
import type { StatusType } from '@/types'
import { CheckCircle2, AlertTriangle, XCircle, Info, Clock } from 'lucide-react'

interface StatusBadgeProps {
  status: StatusType
  text?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusConfig = {
  success: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: AlertTriangle,
  },
  error: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: XCircle,
  },
  info: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    icon: Info,
  },
  pending: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    icon: Clock,
  },
}

const statusTextMap: Record<StatusType, string> = {
  success: '成功',
  warning: '警告',
  error: '失败',
  info: '信息',
  pending: '待处理',
}

export default function StatusBadge({
  status,
  text,
  showIcon = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  const displayText = text || statusTextMap[status]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border transition-all duration-200 hover:scale-105',
        sizeClasses[size],
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizeClasses[size])} />}
      {displayText}
    </span>
  )
}
