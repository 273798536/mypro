import { useMemo, useState } from 'react'
import { GitCompareArrows, GitCompare, ArrowRight, Loader2 } from 'lucide-react'
import type { CompareRow, VersionInfo } from '../../shared/types'
import { api } from '@/api/client'
import { useFetch } from '@/hooks/useFetch'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'

const PREF: Record<string, string> = { a: 'A', b: 'B', tie: '平' }

export default function Versions() {
  const versions = useFetch(() => api.versions(), [])
  const list = versions.data ?? []
  const [a, setA] = useState('')
  const [b, setB] = useState('')

  const effA = a || list[0]?.version || ''
  const effB = b || list[1]?.version || ''

  const compareKey = `${effA}|${effB}`
  const compare = useFetch(
    () => (effA && effB ? api.compare(effA, effB) : Promise.resolve<CompareRow[]>([])),
    [compareKey],
  )
  const rows = compare.data ?? []

  const stats = useMemo(() => {
    const both = rows.filter((r) => r.in_both)
    return {
      total: rows.length,
      both: both.length,
      onlyA: rows.filter((r) => r.in_a && !r.in_b).length,
      onlyB: rows.filter((r) => r.in_b && !r.in_a).length,
      resolved: both.filter((r) => r.conclusion === '通过').length,
      biased: both.filter((r) => r.conclusion === '驳回' || r.conclusion === '待确认').length,
      pending: both.filter((r) => !r.conclusion).length,
    }
  }, [rows])

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <PageHeader
        title="版本追踪"
        subtitle="月底 / 课前回看：版本能否解释清楚偏差"
        icon={GitCompareArrows}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {list.length === 0 && !versions.loading ? (
          <div className="panel col-span-full p-8 text-center text-sm text-zinc-500">
            尚无版本。先在「评测回放」导入标注。
          </div>
        ) : (
          list.map((v) => <VersionCard key={v.version} v={v} />)
        )}
      </div>

      <div className="panel p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-signal" />
            <h3 className="font-display text-base font-semibold text-zinc-100">跨版本对比</h3>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select className="input w-auto" value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">版本 A（默认最新）</option>
              {list.map((v) => (
                <option key={v.version} value={v.version}>
                  {v.label ?? v.version}
                </option>
              ))}
            </select>
            <ArrowRight className="h-4 w-4 text-zinc-600" />
            <select className="input w-auto" value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">版本 B（默认次新）</option>
              {list.map((v) => (
                <option key={v.version} value={v.version}>
                  {v.label ?? v.version}
                </option>
              ))}
            </select>
          </div>
        </div>

        {effA && effB ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6">
              <CompareStat label="对比记录" value={stats.total} />
              <CompareStat label="两版本共有" value={stats.both} accent="text-signal" />
              <CompareStat label="仅 A" value={stats.onlyA} />
              <CompareStat label="仅 B" value={stats.onlyB} />
              <CompareStat label="已结论通过" value={stats.resolved} accent="text-pass" />
              <CompareStat label="仍存疑/驳回" value={stats.biased} accent="text-reject" />
            </div>

            <div className="mt-4 rounded-lg border border-white/5 bg-ink-900/40 p-3 text-xs leading-relaxed text-zinc-400">
              {stats.both > 0
                ? `共有 ${stats.both} 条：其中 ${stats.resolved} 条结论为「通过」，${stats.biased} 条仍为「待确认/驳回」，${stats.pending} 条尚未复核。`
                    .replace(/0 条仍为「待确认\/驳回」，?/, stats.biased ? '' : '无仍存疑结论，')
                : '两版本无共同记录，无法直接对比同一 prompt 的结论变化。'}
            </div>

            <div className="mt-4 overflow-x-auto">
              {compare.loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  对比中…
                </div>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-500">无对比记录</div>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wider text-zinc-500">
                      <th className="px-3 py-2 font-medium">Record</th>
                      <th className="px-3 py-2 font-medium">人工 / RM</th>
                      <th className="px-3 py-2 font-medium">结论</th>
                      <th className="px-3 py-2 font-medium">偏差类型</th>
                      <th className="px-3 py-2 font-medium">归属</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.record_id} className="border-b border-white/[0.03]">
                        <td className="px-3 py-2 font-mono text-xs text-zinc-300">{r.record_id}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          <span className="text-pass">{PREF[r.human_label] ?? r.human_label}</span>
                          <span className="mx-1 text-zinc-600">→</span>
                          <span className={r.has_disagreement ? 'text-signal' : 'text-zinc-500'}>
                            {r.rm_prediction ? PREF[r.rm_prediction] ?? r.rm_prediction : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge conclusion={r.conclusion} />
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-400">{r.bias_type ?? '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <BelongTag label="A" active={r.in_a} />
                            <BelongTag label="B" active={r.in_b} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 py-8 text-center text-sm text-zinc-500">
            至少需要两个版本才能对比。
          </div>
        )}
      </div>
    </div>
  )
}

function VersionCard({ v }: { v: VersionInfo }) {
  const s = v.summary
  return (
    <div className="panel p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-zinc-100">{v.version}</span>
        {v.label && <span className="chip border-white/10 bg-white/5 text-zinc-400">{v.label}</span>}
      </div>
      <div className="mt-1 text-[11px] text-zinc-500">
        {new Date(v.created_at).toLocaleString('zh-CN')} · {v.record_count} 条
      </div>
      {s && (
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <Mini label="通过" value={s.pass} color="text-pass" />
          <Mini label="待确认" value={s.pending_confirm} color="text-warn" />
          <Mini label="驳回" value={s.rejected} color="text-reject" />
          <Mini label="待复核" value={s.pending} color="text-zinc-300" />
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] px-1.5 py-1.5 text-center">
      <div className={cn('font-mono text-base font-semibold', color)}>{value}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  )
}

function CompareStat({ label, value, accent = 'text-zinc-100' }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 text-center">
      <div className={cn('font-mono text-xl font-semibold', accent)}>{value}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  )
}

function BelongTag({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={cn(
        'rounded border px-1.5 py-0.5 font-mono text-[10px]',
        active ? 'border-signal/40 bg-signal/10 text-signal' : 'border-white/10 text-zinc-600',
      )}
    >
      {label}
    </span>
  )
}
