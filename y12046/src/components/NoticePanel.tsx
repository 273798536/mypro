import { Info, AlertTriangle, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlatformNotice, NoticeType } from '@/data/scenarios'

const noticeConfig: Record<NoticeType, { icon: typeof Info; borderColor: string; iconColor: string; bgColor: string }> = {
  info: { icon: Info, borderColor: 'border-l-amber', iconColor: 'text-amber', bgColor: 'bg-amber/5' },
  warning: { icon: AlertTriangle, borderColor: 'border-l-parchment-400', iconColor: 'text-parchment-400', bgColor: 'bg-parchment-400/5' },
  alert: { icon: AlertOctagon, borderColor: 'border-l-danger', iconColor: 'text-danger', bgColor: 'bg-danger/5' },
}

interface NoticePanelProps {
  notices: PlatformNotice[]
}

export default function NoticePanel({ notices }: NoticePanelProps) {
  if (notices.length === 0) {
    return (
      <div className="card-base p-4 text-center text-ink-400 font-serif text-sm">
        暂无通知
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin pr-1">
      {notices.map((notice, index) => {
        const config = noticeConfig[notice.type]
        const Icon = config.icon
        return (
          <div
            key={notice.id}
            className={cn(
              'card-base border-l-4 p-3 animate-slide-in-right',
              config.borderColor,
              config.bgColor
            )}
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-start gap-2.5">
              <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.iconColor)} />
              <div className="min-w-0">
                <h4 className="text-parchment-100 text-sm font-semibold font-serif leading-tight">
                  {notice.title}
                </h4>
                <p className="mt-1 text-ink-200 text-xs leading-relaxed">
                  {notice.content}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
