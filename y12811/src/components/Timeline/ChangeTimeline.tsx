import { useState } from 'react'
import { History, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import TimelineItem from './TimelineItem'
import type { ChangeTimelineProps, ChangeStatus } from '@/types'

export default function ChangeTimeline({ changes, onItemClick }: ChangeTimelineProps) {
  const [filter, setFilter] = useState<ChangeStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredChanges = changes.filter((change) => {
    if (filter === 'all') return true
    return change.status === filter
  })

  const statusCounts = {
    all: changes.length,
    pending: changes.filter((c) => c.status === 'pending').length,
    approved: changes.filter((c) => c.status === 'approved').length,
    rejected: changes.filter((c) => c.status === 'rejected').length,
  }

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="glass-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400/20">
            <History className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">变更历史</h3>
            <p className="text-sm text-lab-300">共 {changes.length} 条变更记录</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-lab-300" />
          <div className="flex rounded-lg bg-white/5 p-1">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                  filter === status
                    ? 'bg-teal-400 text-lab-950'
                    : 'text-lab-300 hover:text-white',
                )}
              >
                {status === 'all' ? '全部' : status === 'pending' ? '待审核' : status === 'approved' ? '已通过' : '已驳回'}
                <span className="ml-1 opacity-60">({statusCounts[status]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        {filteredChanges.length === 0 ? (
          <div className="py-12 text-center text-lab-300">
            <History className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>暂无变更记录</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredChanges.map((change, index) => (
              <TimelineItem
                key={change.id}
                change={change}
                isLast={index === filteredChanges.length - 1}
                isExpanded={expandedId === change.id}
                onToggle={() => handleToggle(change.id)}
                onClick={() => onItemClick?.(change)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
