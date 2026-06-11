import type { RiskLevel } from '@/types'
import { getRiskLevelLabel } from '@/utils/calcEngine'

interface RiskBadgeProps {
  level: RiskLevel
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export default function RiskBadge({ level, showLabel = true, size = 'sm' }: RiskBadgeProps) {
  const label = getRiskLevelLabel(level)
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span className={`badge risk-${level} ${sizeClass}`}>
      {showLabel ? label : ''}
    </span>
  )
}
