import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, GitCompare, Unplug, Timer, TrendingUp, RefreshCw } from 'lucide-react'
import { api, type LatestPayload, type RunDetail } from '@/lib/api'
import { useStore } from '@/store/useStore'
import { Layout } from '@/components/Layout'
import { RunSelector } from '@/components/RunSelector'
import { DelayBars } from '@/components/DelayBars'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/Badge'
import { formatTime, shortRun } from '@/lib/ui'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const { runs, selectedRunId, loadRuns, selectRun, ensureSelected } = useStore()
  const [latest, setLatest] = useState<LatestPayload | null>(null)
  const [detail, setDetail] = useState<RunDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => { loadRuns() }, [loadRuns])
  useEffect(() => { ensureSelected() }, [ensureSelected])

  const activeRunId = selectedRunId ?? latest?.current?.runId ?? null

  useEffect(() => {
    if (!activeRunId) return
    setLoading(true)
    api.getRun(activeRunId)
      .then(setDetail)
      .finally(() => setLoading(false))
  }, [activeRunId])

  useEffect(() => {
    api.getLatest().then(setLatest).catch(() => {})
  }, [runs])

  const current = latest?.current ?? detail?.run ?? null
  const previous = latest?.previous ?? null
  const summary = detail?.summary ?? latest?.summary ?? null

  const handleTrigger = async () => {
    setTriggering(true)
    try {
      const r = await api.triggerRun('rw-cluster-prod')
      await loadRuns()
      selectRun(r.runId)
    } finally {
      setTriggering(false)
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-ink-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-emerald" /> 延迟看板总览
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-ink-300">读写分离复制延迟 · 异常汇总</h1>
            <p className="mt-1 text-sm text-ink-500">schema 对比与索引建议共用本次 run 记录，界面与下载报告同源。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="inline-flex items-center gap-2 rounded-lg border border-signal-sky/40 bg-signal-sky/10 px-3 py-2 text-sm font-medium text-signal-sky transition-colors hover:bg-signal-sky/20 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', triggering && 'animate-spin')} />
              {triggering ? '采集中…' : '触发新一批巡检'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-4">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-ink-500">切换运行</div>
              <RunSelector runs={runs} current={current} previous={previous} onSelect={selectRun} />
              <div className="mt-3 space-y-1.5 text-[11px] text-ink-500">
                <div className="flex justify-between"><span>本次</span><span className="mono text-signal-sky">{current ? shortRun(current.runId) : '—'}</span></div>
                <div className="flex justify-between"><span>上次</span><span className="mono">{previous ? shortRun(previous.runId) : '—'}</span></div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="锁等待过长" value={summary?.counts.byType.lock_wait ?? 0} tone="amber" hint="阻塞读请求" icon={<Lock className="h-4 w-4" />} emphasis />
              <StatCard label="索引失效" value={summary?.counts.byType.index_invalid ?? 0} tone="violet" hint="全表扫描/冗余" icon={<Unplug className="h-4 w-4" />} />
              <StatCard label="Schema 差异" value={summary?.counts.byType.schema_diff ?? 0} tone="sky" hint="主从不一致" icon={<GitCompare className="h-4 w-4" />} />
              <StatCard label="复制延迟实例" value={detail?.delays.filter((d) => d.delaySeconds > d.thresholdSeconds).length ?? 0} tone="rose" hint={`共 ${detail?.delays.length ?? 0} 实例`} icon={<Timer className="h-4 w-4" />} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-ink-300"><Timer className="h-4 w-4 text-signal-sky" /> 复制延迟趋势</div>
              <Badge tone="zinc">{current ? formatTime(current.startedAt) : '—'}</Badge>
            </div>
            {loading ? <div className="py-10 text-center text-xs text-ink-500">加载中…</div> : <DelayBars delays={detail?.delays ?? []} />}
          </div>

          <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-300"><TrendingUp className="h-4 w-4 text-signal-emerald" /> 复核进度</div>
            <div className="flex items-end gap-3">
              <div className="mono text-4xl font-semibold text-signal-emerald">{summary?.approvalRate ?? 0}<span className="text-lg text-ink-500">%</span></div>
              <div className="mb-1 text-[11px] text-ink-500">通过率</div>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <ProgressRow label="待复核" value={summary?.counts.pending ?? 0} tone="amber" />
              <ProgressRow label="已通过" value={summary?.counts.approved ?? 0} tone="emerald" />
              <ProgressRow label="已驳回" value={summary?.counts.rejected ?? 0} tone="rose" />
            </div>
            <Link to="/review" className="mt-4 block rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-center text-xs font-medium text-ink-300 transition-colors hover:border-signal-sky/40 hover:text-signal-sky">
              前往复核中心 →
            </Link>
          </div>
        </div>

        {current && (
          <div className="mt-4 rounded-xl border border-ink-800 bg-ink-900/40 p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <span className="text-ink-500">本次运行:</span>
              <span className="mono text-ink-300">{current.runId}</span>
              <span className="text-ink-500">|</span>
              <span className="text-ink-300">延迟 {current.delayCount} · Schema 差异 {current.schemaDiffCount} · 索引建议 {current.indexSuggestionCount} · 异常 {current.issueCount}</span>
              {previous && (
                <>
                  <span className="text-ink-500">|</span>
                  <span className="text-ink-500">上次: <span className="mono">{shortRun(previous.runId)}</span> 异常 {previous.issueCount}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function ProgressRow({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'emerald' | 'rose' }) {
  const c = toneClassesHint(tone)
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-400">{label}</span>
      <span className={cn('mono font-semibold', c)}>{value}</span>
    </div>
  )
}

function toneClassesHint(tone: 'amber' | 'emerald' | 'rose') {
  const map = { amber: 'text-signal-amber', emerald: 'text-signal-emerald', rose: 'text-signal-rose' } as const
  return map[tone]
}
