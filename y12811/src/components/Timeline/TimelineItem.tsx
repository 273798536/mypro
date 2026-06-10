import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimelineItemProps, ChangeStatus } from '@/types'

const statusConfig: Record<ChangeStatus, { icon: typeof CheckCircle; color: string; bgColor: string; label: string }> = {
  pending: {
    icon: AlertCircle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400',
    label: '待审核',
  },
  approved: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400',
    label: '已通过',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-400',
    label: '已驳回',
  },
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TimelineItem({
  change,
  isLast = false,
  isExpanded: controlledExpanded,
  onToggle,
  onClick,
}: TimelineItemProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded
  const status = statusConfig[change.status]
  const StatusIcon = status.icon

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggle) {
      onToggle()
    } else {
      setInternalExpanded(!isExpanded)
    }
  }

  const handleClick = () => {
    onClick?.()
  }

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-lab-950',
            status.bgColor,
          )}
        >
          <StatusIcon className="h-4 w-4 text-lab-950" />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-teal-400 to-teal-400/30" />
        )}
      </div>

      <div className="flex-1 pb-8">
        <div
          className={cn(
            'glass-card cursor-pointer p-4 transition-all duration-300 hover:bg-white/10',
            isExpanded && 'ring-1 ring-teal-400/50',
          )}
          onClick={handleClick}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {change.operator.avatar ? (
                <img
                  src={change.operator.avatar}
                  alt={change.operator.name}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-400/20 ring-2 ring-teal-400/30">
                  <User className="h-5 w-5 text-teal-400" />
                </div>
              )}
              <div>
                <div className="font-medium text-white">{change.operator.name}</div>
                <div className="flex items-center gap-1 text-xs text-lab-300">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(change.timestamp)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'status-badge',
                  change.status === 'pending' && 'bg-yellow-400/20 text-yellow-400',
                  change.status === 'approved' && 'bg-green-400/20 text-green-400',
                  change.status === 'rejected' && 'bg-red-400/20 text-red-400',
                )}
              >
                {status.label}
              </span>
              <button
                onClick={handleToggle}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-lab-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mt-3 text-sm text-lab-200">{change.reason}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {change.fields.map((field, index) => (
              <span
                key={index}
                className={cn(
                  'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                  field.type === 'add' && 'bg-green-400/20 text-green-400',
                  field.type === 'delete' && 'bg-red-400/20 text-red-400',
                  field.type === 'modify' && 'bg-yellow-400/20 text-yellow-400',
                )}
              >
                {field.label}
              </span>
            ))}
          </div>

          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-in-out',
              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="text-xs font-medium text-lab-300 mb-2">详细变更内容</div>
              <div className="space-y-2">
                {change.fields.map((field, index) => (
                  <div
                    key={index}
                    className={cn(
                      'rounded-md p-2 text-sm',
                      field.type === 'add' && 'bg-green-400/10',
                      field.type === 'delete' && 'bg-red-400/10',
                      field.type === 'modify' && 'bg-yellow-400/10',
                    )}
                  >
                    <div className="font-medium text-white mb-1">{field.label}</div>
                    {field.type === 'add' && (
                      <div className="text-green-400">
                        新增: <span className="font-mono">{String(field.newValue)}</span>
                      </div>
                    )}
                    {field.type === 'delete' && (
                      <div className="text-red-400 line-through">
                        删除: <span className="font-mono">{String(field.oldValue)}</span>
                      </div>
                    )}
                    {field.type === 'modify' && (
                      <div className="space-y-1">
                        <div className="text-red-400">
                          旧值: <span className="font-mono line-through">{String(field.oldValue)}</span>
                        </div>
                        <div className="text-green-400">
                          新值: <span className="font-mono">{String(field.newValue)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
