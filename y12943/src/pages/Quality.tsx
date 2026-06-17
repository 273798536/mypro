import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Filter, FlaskConical, ScanSearch } from 'lucide-react'
import { api } from '@/lib/api'
import { useFetch } from '@/hooks/useFetch'
import {
  Panel,
  SectionTitle,
  Skeleton,
  StatusBadge,
  QualityBadge,
  BadTypeBadge,
  EmptyState,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Slice, Quality } from '../../shared/types'

const FILTERS: { key: string; label: string }[] = [
  { key: 'bad', label: '坏记录优先' },
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'pass', label: '通过' },
]

const TRIO_STYLE: Record<Quality, { border: string; label: string; tone: string }> = {
  normal: { border: 'border-viridian/40', label: '正常样本', tone: 'text-viridian' },
  edge: { border: 'border-saffron/40', label: '边界样本', tone: 'text-saffron' },
  bad: { border: 'border-brick/50', label: '明显坏样本', tone: 'text-brick' },
}

export default function Quality() {
  const [params, setParams] = useSearchParams()
  const filter = params.get('filter') ?? 'bad'
  const setFilter = (f: string) => setParams(f === 'bad' ? {} : { filter: f })

  const { data: slices, loading, error } = useFetch<Slice[]>(() => api.slices(filter), [filter])
  const { data: trio } = useFetch(() => api.samples(), [])

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="QUALITY · 切片质检"
        title="坏记录拎取"
        desc="默认按坏记录优先排序。安全审核员先确认工具真跑：正常、边界、明显坏三类样例各一条。"
        right={
          <div className="hidden items-center gap-2 text-xs text-ink-400 md:flex">
            <Filter className="h-3.5 w-3.5" /> 筛选
          </div>
        }
      />

      <div>
        <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          <FlaskConical className="h-3.5 w-3.5 text-saffron" /> 样例三件套（确认工具真跑）
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(['normal', 'edge', 'bad'] as Quality[]).map((q) => {
            const s = trio ? (trio as Record<string, Slice | null>)[q] : null
            const st = TRIO_STYLE[q]
            return (
              <Panel key={q} className={cn('flex flex-col', st.border)} >
                <div className={cn('mb-3 flex items-center justify-between', st.tone)}>
                  <span className="font-mono text-xs uppercase tracking-wider">{st.label}</span>
                  {s && <QualityBadge quality={q} />}
                </div>
                {s ? (
                  <>
                    <div className="mb-2 font-mono text-xs text-ink-400">{s.id}</div>
                    <p className="flex-1 font-mono text-sm leading-relaxed text-ink-300">
                      {s.content}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
                      <span>{s.eval_bank}</span>
                      <span>·</span>
                      <span>{s.seg_list}</span>
                    </div>
                  </>
                ) : (
                  <Skeleton className="h-24" />
                )}
              </Panel>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm transition-colors',
              filter === f.key
                ? 'border-saffron/50 bg-saffron/10 text-saffron'
                : 'border-ink-700 text-ink-300 hover:border-ink-600 hover:text-paper',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Panel pad={false}>
        {error && (
          <div className="p-4 text-sm text-brick">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        )}
        {loading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}
        {slices && slices.length === 0 && !loading && (
          <EmptyState title="无匹配切片" desc="换个筛选条件试试。" />
        )}
        {slices && slices.length > 0 && (
          <div className="divide-y divide-ink-700/50">
            {slices.map((s) => (
              <SliceRow key={s.id} slice={s} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function SliceRow({ slice }: { slice: Slice }) {
  const [open, setOpen] = useState(false)
  const isBad = slice.quality === 'bad'
  return (
    <div
      className={cn(
        'group relative px-4 py-3 transition-colors hover:bg-ink-800/40',
        isBad && 'bg-brick/5',
      )}
    >
      {isBad && <span className="absolute left-0 top-0 h-full w-0.5 bg-brick" />}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-paper">{slice.id}</span>
            <StatusBadge status={slice.status} />
            <BadTypeBadge badType={slice.bad_type} />
            {slice.dup_of && (
              <span className="chip border-saffron/40 bg-saffron/10 text-saffron">
                dup_of → {slice.dup_of}
              </span>
            )}
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-400">
            <span>评测题库：{slice.eval_bank}</span>
            <span>切分清单：{slice.seg_list}</span>
          </div>
          <p
            className={cn(
              'cursor-pointer font-mono text-sm leading-relaxed text-ink-300',
              !open && 'line-clamp-2',
            )}
            onClick={() => setOpen((o) => !o)}
          >
            {slice.content}
          </p>
        </div>
        <Link
          to={`/trace?record=${slice.id}`}
          className="flex shrink-0 items-center gap-1 rounded-md border border-ink-700 px-2.5 py-1.5 text-xs text-ink-300 transition-colors hover:border-saffron/50 hover:text-saffron"
        >
          <ScanSearch className="h-3.5 w-3.5" /> 溯源
        </Link>
      </div>
    </div>
  )
}
