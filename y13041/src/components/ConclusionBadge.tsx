import { cn } from '@/lib/utils'
import type { ConclusionType } from '@/shared/types'

interface ConclusionBadgeProps {
  conclusion: ConclusionType
  className?: string
}

const conclusionConfig: Record<
  ConclusionType,
  { label: string; className: string }
> = {
  normal: {
    label: '正常',
    className:
      'bg-green-50 text-green-700 border-green-200',
  },
  abnormal: {
    label: '异常',
    className:
      'bg-red-50 text-red-700 border-red-200',
  },
  pending_review: {
    label: '待复核',
    className:
      'bg-gray-50 text-gray-600 border-gray-200',
  },
}

export default function ConclusionBadge({
  conclusion,
  className,
}: ConclusionBadgeProps) {
  const config = conclusionConfig[conclusion]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
