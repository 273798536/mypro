import { cn } from '@/lib/utils'
import type { OrderStatus, ExceptionSeverity, ExceptionStatus, SplitResultStatus } from '../../../shared/types'

interface StatusTagProps {
  status: OrderStatus | ExceptionSeverity | ExceptionStatus | SplitResultStatus
  className?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: '待处理', className: 'bg-amber-100 text-amber-800' },
  PROCESSED: { label: '已分账', className: 'bg-emerald-100 text-emerald-800' },
  EXCEPTION: { label: '异常', className: 'bg-rose-100 text-rose-800' },
  ERROR: { label: '异常', className: 'bg-rose-100 text-rose-800' },
  OPEN: { label: '待处理', className: 'bg-amber-100 text-amber-800' },
  PROCESSING: { label: '处理中', className: 'bg-blue-100 text-blue-800' },
  RESOLVED: { label: '已解决', className: 'bg-emerald-100 text-emerald-800' },
  CONFIRMED: { label: '已确认', className: 'bg-emerald-100 text-emerald-800' },
}

const exceptionTypeConfig: Record<string, { label: string; className: string }> = {
  COMBO_SPLIT: { label: '联票拆分', className: 'bg-orange-100 text-orange-800' },
  REFUND_CROSS: { label: '跨场退款', className: 'bg-purple-100 text-purple-800' },
  SPONSORSHIP: { label: '赞助抵扣', className: 'bg-cyan-100 text-cyan-800' },
  DATA_CONFLICT: { label: '数据冲突', className: 'bg-rose-100 text-rose-800' },
  RULE_MISSING: { label: '规则缺失', className: 'bg-red-100 text-red-800' },
}

export function StatusTag({ status, className }: StatusTagProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
  
  return (
    <span className={cn(
      'px-2 py-1 text-xs font-medium rounded-full',
      config.className,
      className
    )}>
      {config.label}
    </span>
  )
}

export function ExceptionTypeTag({ type, className }: { type: string; className?: string }) {
  const config = exceptionTypeConfig[type] || { label: type, className: 'bg-gray-100 text-gray-800' }
  
  return (
    <span className={cn(
      'px-2 py-1 text-xs font-medium rounded-full',
      config.className,
      className
    )}>
      {config.label}
    </span>
  )
}
