import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Workflow,
  ShieldOff,
  ScrollText,
  FileStack,
  Database,
  Search,
  AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useFetch } from '@/hooks/useFetch'
import { Panel, SectionTitle, Skeleton, StatusBadge, BadTypeBadge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { TraceChain } from '../../shared/types'

export default function Trace() {
  const [params, setParams] = useSearchParams()
  const recordId = params.get('record') ?? 'SLC-1005'
  const [input, setInput] = useState(recordId)

  const { data, loading, error } = useFetch<TraceChain>(() => api.trace(recordId), [recordId])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) setParams({ record: input.trim() })
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="TRACE · 日志溯源"
        title="模型日志倒查链路"
        desc="验收会取一条安全规则漏配记录，沿模型日志线一路倒查：结果 → 处理记录 → 来源切片 → 原始导入批次，全链路不断链。"
      />

      <Panel>
        <form onSubmit={submit} className="flex items-center gap-3">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入记录ID，如 SLC-1005"
            className="flex-1 bg-transparent font-mono text-sm text-paper outline-none placeholder:text-ink-600"
          />
          <button
            type="submit"
            className="rounded-lg bg-saffron px-4 py-1.5 text-sm font-medium text-ink-950 hover:opacity-90"
          >
            倒查
          </button>
        </form>
        <div className="mt-2 font-mono text-[11px] text-ink-400">
          默认取安全规则漏配记录 SLC-1005 做溯源验收倒查。
        </div>
      </Panel>

      {error && (
        <Panel className="border-brick/50">
          <div className="flex items-center gap-2 text-sm text-brick">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        </Panel>
      )}

      {loading && <Skeleton className="h-96" />}

      {data && <TraceTimeline chain={data} />}
    </div>
  )
}

function TraceTimeline({ chain }: { chain: TraceChain }) {
  const nodes = [
    {
      icon: ShieldOff,
      title: '结果记录',
      tag: chain.record.label,
      tone: 'brick' as const,
      body: (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-paper">{chain.record.id}</span>
            <StatusBadge status="bad" />
          </div>
          <p className="font-mono text-xs text-ink-300">{chain.record.result}</p>
        </div>
      ),
    },
    {
      icon: ScrollText,
      title: '模型日志线',
      tag: `${chain.logs.length} 条`,
      tone: 'saffron' as const,
      body: (
        <div className="space-y-2">
          {chain.logs.map((l) => (
            <div
              key={l.id}
              className="rounded-md border border-ink-700/60 bg-ink-950/50 px-3 py-2"
            >
              <div className="mb-0.5 flex items-center gap-2">
                <span className="font-mono text-[11px] text-saffron">{l.id}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
                  {l.event}
                </span>
              </div>
              <p className="font-mono text-xs leading-relaxed text-ink-300">{l.message}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: FileStack,
      title: '处理记录（复核）',
      tag: chain.review?.id ?? '—',
      tone: 'viridian' as const,
      body: chain.review ? (
        <div className="space-y-2">
          <div className="font-display font-semibold text-paper">{chain.review.round_name}</div>
          <p className="text-sm text-ink-300">{chain.review.conclusion ?? '待确认'}</p>
          <div className="rounded-md border border-ink-700/60 bg-ink-950/50 px-3 py-2 font-mono text-[11px] text-ink-400">
            材料：{chain.review.materials}
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-400">未纳入复核轮次。</p>
      ),
    },
    {
      icon: Database,
      title: '来源切片',
      tag: chain.slice?.id ?? '—',
      tone: 'ink' as const,
      body: chain.slice ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-paper">{chain.slice.id}</span>
            <StatusBadge status={chain.slice.status} />
            <BadTypeBadge badType={chain.slice.bad_type} />
            {chain.slice.dup_of && (
              <span className="chip border-saffron/40 bg-saffron/10 text-saffron">
                dup_of → {chain.slice.dup_of}
              </span>
            )}
          </div>
          <p className="font-mono text-xs leading-relaxed text-ink-300">{chain.slice.content}</p>
          <div className="font-mono text-[11px] text-ink-400">
            {chain.slice.eval_bank} · {chain.slice.seg_list}
          </div>
        </div>
      ) : null,
    },
    {
      icon: Workflow,
      title: '原始导入批次',
      tag: chain.importBatch?.id ?? '—',
      tone: 'ink' as const,
      body: chain.importBatch ? (
        <div className="space-y-1.5">
          <div className="font-display font-semibold text-paper">{chain.importBatch.batch_name}</div>
          <div className="font-mono text-xs text-ink-400">{chain.importBatch.source_path}</div>
          <div className="font-mono text-[11px] text-ink-500">
            导入时间 {chain.importBatch.created_at}
          </div>
        </div>
      ) : null,
    },
  ]

  const toneMap = {
    brick: 'border-brick/40 bg-brick/10 text-brick',
    saffron: 'border-saffron/40 bg-saffron/10 text-saffron',
    viridian: 'border-viridian/40 bg-viridian/10 text-viridian',
    ink: 'border-ink-600 bg-ink-800 text-paper',
  }

  return (
    <Panel>
      <div className="relative">
        <div className="absolute bottom-4 left-[19px] top-4 w-px bg-gradient-to-b from-brick via-saffron to-viridian" />
        <ol className="space-y-6">
          {nodes.map((n, i) => {
            const Icon = n.icon
            return (
              <li key={i} className="relative flex gap-4 animate-risein" style={{ animationDelay: `${i * 90}ms` }}>
                <div
                  className={cn(
                    'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
                    toneMap[n.tone],
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
                      {n.title}
                    </span>
                    <span className="font-mono text-[11px] text-ink-300">{n.tag}</span>
                  </div>
                  {n.body}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </Panel>
  )
}
