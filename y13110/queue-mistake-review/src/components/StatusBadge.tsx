import { ProcessStatus, ProcessStatusLabel, ProcessStatusColor } from '../types'

interface StatusBadgeProps {
  status: ProcessStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${ProcessStatusColor[status]}`}>
      {ProcessStatusLabel[status]}
    </span>
  )
}
