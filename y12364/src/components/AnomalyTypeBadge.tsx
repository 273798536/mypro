import { cn } from '@/lib/utils'

const typeConfig: Record<string, { label: string; className: string }> = {
  zero_drift: {
    label: '零点漂移',
    className: 'bg-purple-500/20 text-purple-400',
  },
  angle_exceed: {
    label: '迎角越界',
    className: 'bg-orange-500/20 text-orange-400',
  },
  speed_missing: {
    label: '速度缺采',
    className: 'bg-cyan-500/20 text-cyan-400',
  },
}

interface AnomalyTypeBadgeProps {
  type: string
  className?: string
}

export default function AnomalyTypeBadge({ type, className }: AnomalyTypeBadgeProps) {
  const config = typeConfig[type] || { label: type, className: 'bg-slate-500/20 text-slate-400' }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
