import { History, User, Clock } from 'lucide-react'
import type { HistoryItem } from '@/types'

interface HistoryTimelineProps {
  history: HistoryItem[]
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function HistoryTimeline({ history }: HistoryTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
        <History size={32} className="mx-auto text-text-muted mb-2" />
        <p className="text-sm text-text-muted">暂无历史记录</p>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <History size={16} className="text-text-muted" />
        <h3 className="text-sm font-medium text-text-primary">操作历史</h3>
      </div>

      <div className="relative">
        <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border" />

        <div className="space-y-4">
          {history.map((item, index) => {
            const isLatest = index === 0
            return (
              <div key={item.id} className="relative flex gap-4">
                <div
                  className={`relative z-10 w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${
                    isLatest
                      ? 'bg-primary border-primary'
                      : 'bg-bg-card border-border'
                  }`}
                >
                  {isLatest && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>

                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {item.version && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary border border-primary/40">
                        v{item.version}
                      </span>
                    )}
                    <span className="text-sm font-medium text-text-primary">{item.action}</span>
                    {isLatest && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-bg-hover text-text-muted">
                        最新
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-muted mb-1.5">
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      <span>{item.userName || item.userId}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{formatTimestamp(item.timestamp)}</span>
                    </div>
                  </div>

                  {item.details && (
                    <p className="text-sm text-text-secondary leading-relaxed">{item.details}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default HistoryTimeline
