import type { SummaryCounts } from '@/data/types'
import { AlertTriangle, ArrowRightLeft, Check, Hourglass } from 'lucide-react'

const CARDS = [
  {
    key: 'change',
    label: '改判',
    icon: ArrowRightLeft,
    ring: 'border-change/30',
    text: 'text-change-deep',
    bar: 'bg-change',
  },
  {
    key: 'consistent',
    label: '一致',
    icon: Check,
    ring: 'border-consistent/30',
    text: 'text-consistent-deep',
    bar: 'bg-consistent',
  },
  {
    key: 'drift',
    label: '漂移待确认',
    icon: AlertTriangle,
    ring: 'border-drift/30',
    text: 'text-drift-deep',
    bar: 'bg-drift',
  },
  {
    key: 'pending',
    label: '待处理',
    icon: Hourglass,
    ring: 'border-pending/30',
    text: 'text-pending-deep',
    bar: 'bg-pending',
  },
] as const

export function SummaryCards({ counts }: { counts: SummaryCounts }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon
        const value = counts[card.key]
        return (
          <div
            key={card.key}
            className={`panel relative overflow-hidden p-4 ${card.ring}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink-600">{card.label}</span>
              <Icon className={`h-3.5 w-3.5 ${card.text}`} strokeWidth={2} />
            </div>
            <div className={`num mt-2 text-[34px] font-semibold leading-none ${card.text}`}>
              {String(value).padStart(2, '0')}
            </div>
            <div className="num mt-1 text-[11px] text-ink-400">
              / {String(counts.total).padStart(2, '0')} 条
            </div>
            <span className={`absolute inset-x-0 bottom-0 h-[2px] ${card.bar}`} />
          </div>
        )
      })}
    </div>
  )
}
