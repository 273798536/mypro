import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import type { WorkOrder } from '@/types'
import { useReviewStore } from '@/store/useReviewStore'
import { StatusStamp } from '@/components/StatusStamp'
import { SourceBadge } from '@/components/SourceBadge'

interface OrderListProps {
  orders: WorkOrder[]
  selectedSampleId: string | null
}

export function OrderList({ orders, selectedSampleId }: OrderListProps) {
  const { sourceFilter, setSourceFilter, samples, setSelected } = useReviewStore()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const sources = Array.from(new Set(orders.map((o) => o.source)))
  const filtered = orders.filter(
    (o) =>
      (!sourceFilter || o.source === sourceFilter) &&
      (q === '' ||
        o.orderId.toLowerCase().includes(q.toLowerCase()) ||
        o.subject.includes(q)),
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-900/10 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-serif text-sm font-700 text-ink-900">线上工单</h3>
          <span className="font-mono text-[10px] text-ink-400">{filtered.length} 条</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索工单号 / 主题"
            className="w-full rounded-[3px] border border-ink-900/15 bg-paper-50 py-1.5 pl-8 pr-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-dossier/50 focus:outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <FilterChip active={!sourceFilter} onClick={() => setSourceFilter(null)}>
            全部来源
          </FilterChip>
          {sources.map((s) => (
            <FilterChip
              key={s}
              active={sourceFilter === s}
              onClick={() => setSourceFilter(sourceFilter === s ? null : s)}
            >
              {s.length > 8 ? s.slice(0, 8) + '…' : s}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {filtered.map((o) => {
          const orderSamples = samples.filter((s) => s.orderId === o.orderId)
          const open = expanded === o.orderId
          return (
            <div
              key={o.orderId}
              className="rounded-md border border-ink-900/10 bg-paper-50 transition hover:border-ink-900/20"
            >
              <button
                className="w-full px-3 py-2.5 text-left"
                onClick={() => setExpanded(open ? null : o.orderId)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-600 text-ink-700">
                    {o.orderId}
                  </span>
                  <StatusStamp status={o.status} size="sm" />
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-ink-500">{o.subject}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <SourceBadge source={o.source} />
                  <span className="flex items-center gap-0.5 text-[10px] text-ink-400">
                    {open ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {orderSamples.length} 样本
                  </span>
                </div>
              </button>

              {open && (
                <div className="border-t border-ink-900/10 px-3 py-2.5">
                  <div className="mb-2 rounded-[3px] border border-amber/30 bg-amber/5 px-2 py-1.5 text-[10px] leading-relaxed text-amber-dark">
                    字段名前后不一时，已归一化保住
                    <span className="font-600"> 来源 </span>与
                    <span className="font-600"> 处理状态 </span>两项。
                  </div>
                  <div className="mb-2 space-y-0.5">
                    {Object.entries(o.rawFields).map(([k, v]) => (
                      <div key={k} className="flex gap-2 font-mono text-[10px]">
                        <span className="w-16 shrink-0 text-ink-400">{k}</span>
                        <span className="text-ink-700">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {orderSamples.map((s) => {
                      const active = s.sampleId === selectedSampleId
                      return (
                        <button
                          key={s.sampleId}
                          className={`flex w-full items-center justify-between rounded-[3px] px-2 py-1.5 text-left transition ${
                            active
                              ? 'bg-dossier/10 ring-1 ring-dossier/30'
                              : 'hover:bg-paper-200/60'
                          }`}
                          onClick={() => setSelected(s.sampleId)}
                        >
                          <span className="font-mono text-[10px] text-ink-700">
                            {s.sampleId}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {s.hasLabelConflict && (
                              <span
                                title="标签冲突·已隔离"
                                className="inline-block h-1.5 w-1.5 rounded-full bg-forensic"
                              />
                            )}
                            <span className="font-mono text-[10px] font-600 text-dossier">
                              {s.machineScore}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2 py-0.5 text-[10px] transition ${
        active
          ? 'bg-dossier text-paper-50'
          : 'border border-ink-900/15 text-ink-500 hover:bg-paper-200/60'
      }`}
    >
      {children}
    </button>
  )
}
