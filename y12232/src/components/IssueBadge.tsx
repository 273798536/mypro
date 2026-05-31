import { cn } from '@/lib/utils'
import type { IssueType } from '@/types'

const issueConfig: Record<IssueType, { label: string; className: string }> = {
  breakpoint: { label: '轨迹断点', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  duplicate: { label: '面积重复', className: 'bg-red-50 text-red-700 border-red-200' },
  missing_signature: { label: '签字缺失', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  area_mismatch: { label: '面积不一致', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
}

interface IssueBadgeProps {
  type: IssueType
  className?: string
}

export default function IssueBadge({ type, className }: IssueBadgeProps) {
  const config = issueConfig[type]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border transition-all duration-200',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
