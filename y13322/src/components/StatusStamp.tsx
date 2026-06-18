import type { ProcessStatus } from '@/types'
import { STATUS_META } from '@/lib/format'

interface StatusStampProps {
  status: ProcessStatus
  size?: 'sm' | 'md'
}

export function StatusStamp({ status, size = 'md' }: StatusStampProps) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`stamp ${meta.text} ${meta.ring} ${
        size === 'sm' ? 'text-[10px]' : ''
      }`}
      style={{ transform: 'rotate(-2deg)' }}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}
