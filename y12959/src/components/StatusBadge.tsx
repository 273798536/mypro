import { cn } from '@/lib/utils'
import type { ConflictStatus } from '../types'

interface StatusBadgeProps {
  status: ConflictStatus
  className?: string
}

const statusConfig: Record<ConflictStatus, {
  label: string
  bgClass: string
  textClass: string
  borderClass: string
  barClass: string
  description: string
}> = {
  pending: {
    label: '待处理',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
    barClass: 'bg-slate-500',
    description: '尚未分配处理人，或分配后未进入修正流程。',
  },
  in_progress: {
    label: '处理中',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-300',
    barClass: 'bg-indigo-500',
    description: '已分配处理人，正在核对数据、制定修正策略。',
  },
  resolved: {
    label: '已处理',
    bgClass: 'bg-success-50',
    textClass: 'text-success-700',
    borderClass: 'border-success-300',
    barClass: 'bg-success-500',
    description: '已完成修正，备份与回滚记录已生成，支持随时撤销。',
  },
  ignored: {
    label: '已忽略',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-500',
    borderClass: 'border-slate-300',
    barClass: 'bg-slate-400',
    description: '经人工判断无需修正（如幂等按预期拦截、下游自行兼容）。',
  },
  unavailable: {
    label: '不可用',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-300',
    barClass: 'bg-purple-500',
    description: '原始数据或上下文缺失，无法按正常流程处理，需转交专项。',
  },
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
        config.bgClass,
        config.textClass,
        config.borderClass,
        className
      )}
      title={config.description}
    >
      <span className={cn('h-2 w-2 rounded-full', config.barClass)} />
      {config.label}
    </span>
  )
}
