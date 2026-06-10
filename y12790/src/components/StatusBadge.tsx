import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import type { ConclusionGrade } from '@/types'
import { cn } from '@/lib/utils'

const gradeConfig: Record<ConclusionGrade, { label: string; icon: typeof CheckCircle; bg: string; text: string; border: string }> = {
  usable: {
    label: '合格',
    icon: CheckCircle,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  review: {
    label: '待复核',
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  bad: {
    label: '不合格',
    icon: XCircle,
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
}

interface StatusBadgeProps {
  grade: ConclusionGrade
  size?: 'sm' | 'md'
}

export default function StatusBadge({ grade, size = 'sm' }: StatusBadgeProps) {
  const config = gradeConfig[grade]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.bg,
        config.text,
        config.border
      )}
    >
      <Icon size={size === 'sm' ? 13 : 15} />
      {config.label}
    </span>
  )
}
