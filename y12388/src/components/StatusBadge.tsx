import { RegistrationStatus, AnomalyType } from '@/types'
import { getStatusText, getStatusColor, getAnomalyText, getAnomalyColor } from '@/utils/format'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: RegistrationStatus
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full text-white',
        getStatusColor(status),
        sizeClasses[size]
      )}
    >
      {getStatusText(status)}
    </span>
  )
}

interface AnomalyBadgeProps {
  type: AnomalyType
}

export function AnomalyBadge({ type }: AnomalyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded border',
        getAnomalyColor(type)
      )}
    >
      {getAnomalyText(type)}
    </span>
  )
}

export function AnomalyBadgeList({ anomalies }: { anomalies: AnomalyType[] }) {
  if (anomalies.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {anomalies.map((type, idx) => (
        <AnomalyBadge key={idx} type={type} />
      ))}
    </div>
  )
}
