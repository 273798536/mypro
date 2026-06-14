import { AlertCircle, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ConflictStatus } from '@/types'
import { STATUS_LABEL } from '@/types'
import { cn } from '@/lib/utils'

const STYLE: Record<ConflictStatus, {
  bg: string
  border: string
  text: string
  icon: typeof AlertCircle
  dot: string
}> = {
  normal: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-400/30',
    text: 'text-emerald-300',
    icon: CheckCircle2,
    dot: 'bg-emerald-400',
  },
  auth_expired: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-400/40',
    text: 'text-violet-300',
    icon: ShieldAlert,
    dot: 'bg-violet-400',
  },
  name_mismatch: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/40',
    text: 'text-amber-300',
    icon: AlertTriangle,
    dot: 'bg-amber-400',
  },
}

interface Props {
  status: ConflictStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const s = STYLE[status]
  const Icon = s.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium',
        s.bg,
        s.border,
        s.text,
        size === 'sm' ? 'text-[11px]' : 'text-xs',
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{STATUS_LABEL[status]}</span>
    </span>
  )
}
