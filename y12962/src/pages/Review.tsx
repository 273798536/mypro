import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronRight, Clock, GitCompare, KeyRound, ListChecks, MessageSquareWarning, ShieldCheck, User } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import { Layout } from '@/components/Layout'
import { Badge } from '@/components/Badge'
import { cn } from '@/lib/utils'
import {
  TYPE_LABEL, SEVERITY_LABEL, STATUS_LABEL,
  typeTone, severityTone, statusTone, formatTime,
} from '@/lib/ui'
import type { Issue, IssueTrace, IssueType, IssueStatus, ReviewHistory } from '@shared/types'

export default function Review() {
  const { runs, selectedRunId, loadRuns, ensureSelected } = useStore()
  useEffect(() => { loadRuns() }, [loadRuns])
  useEffect(() => { ensureSelected() }, [ensureSelected])
  const activeRunId = selectedRunId ?? runs[0]?.runId ?? null

  const [filterType, setFilterType] = useState<IssueType | ''>('')
  const [filterStatus, setFilterStatus] = useState<IssueStatus | ''>('')
  const [issues, setIssues] = useState<Issue[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [trace, setTrace] = useState<IssueTrace | null>(null)
  const [loadingTrace, setLoadingTrace] = useState(false)

  const [reviewer, setReviewer] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const loadIssues = useCallback(async () => {
    if (!activeRunId) return
    setLoadingList(true)
    try {
      const list = await api.listIssues({
        runId: activeRunId,
        type: filterType || undefined,
        status: filterStatus || undefined,
      })
      setIssues(list)
      if (!selectedId || !list.some((i) => i.id === selectedId)) {
        setSelectedId(list[0]?.id ?? null)
      }
    } finally {
      setLoadingList(false)
    }
  }, [activeRunId, filterType, filterStatus, selectedId])

  useEffect(() => { loadIssues() }, [loadIssues])

  useEffect(() => {
    if (selectedId == null) { setTrace(null); return }
    setLoadingTrace(true)
    setReviewError(null)
    api.traceIssue(selectedId)
      .then(setTrace)
      .finally(() => setLoadingTrace(false))
  }, [selectedId])

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedId) return
    setReviewError(null)
    if (!reviewer.trim()) { setReviewError('请填写复核人（需记录是谁改的）'); return }
    if (!reason.trim()) { setReviewError('复核理由不能为空（需记录为什么改）'); return }
    setSubmitting(true)
    try {
      const t = await api.reviewIssue(selectedId, { action, reviewer: reviewer.trim(), reason: reason.trim() })
      setTrace(t)
      setReason('')
      await loadIssues()
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const i of issues) m[i.type] = (m[i.type] ?? 0) + 1
    return m
  }, [issues])

  return (
    <Layout>
      <div className="flex h-full min-h-0">
        {/* 左侧列表 */}
        <section className="flex w-72 shrink-0 flex-col border-r border-ink-800 bg-ink-950/40">
          <div className="border-b border-ink-800 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-ink-500">
              <ListChecks className="h-3.5 w-3.5" /> 复核中心
            </div>
            <h2 className="mt-1 text-lg font-semibold text-ink-300">异常清单</h2>
            <div className="mt-1 mono text-[11px] text-ink-500">{activeRunId ? activeRunId : '无运行'}</div>
          </div>
          <div className="flex flex-col gap-2 border-b border-ink-800 p-3">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">类型</div>
              <div className="flex flex-wrap gap-1">
                {(['', 'lock_wait', 'schema_diff', 'index_invalid'] as const).map((t) => (
                  <FilterChip key={t} active={filterType === t} onClick={() => setFilterType(t)}>
                    {t === '' ? '全部' : TYPE_LABEL[t]}{t && typeCounts[t] ? ` ${typeCounts[t]}` : ''}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">状态</div>
              <div className="flex flex-wrap gap-1">
                {(['', 'pending', 'approved', 'rejected'] as const).map((s) => (
                  <FilterChip key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>
                    {s === '' ? '全部' : STATUS_LABEL[s]}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {loadingList && <div className="px-4 py-6 text-xs text-ink-500">加载中…</div>}
            {!loadingList && issues.length === 0 && <div className="px-4 py-6 text-center text-xs text-ink-500">无匹配异常</div>}
            {issues.map((i) => {
              const active = i.id === selectedId
              return (
                <button
                  key={i.id}
                  onClick={() => setSelectedId(i.id)}
                  className={cn(
                    'flex w-full flex-col gap-1 border-l-2 px-3 py-2.5 text-left transition-colors',
                    active ? 'border-signal-sky bg-signal-sky/10' : 'border-transparent hover:bg-ink-850',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={typeTone(i.type)} dot>{TYPE_LABEL[i.type]}</Badge>
                    <Badge tone={statusTone(i.status)}>{STATUS_LABEL[i.status]}</Badge>
                  </div>
                  <div className="mono truncate text-xs text-ink-300" title={issueLabel(i)}>{issueLabel(i)}</div>
                  <div className="flex items-center justify-between text-[10px] text-ink-500">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(i.detectedAt)}</span>
                    <Badge tone={severityTone(i.severity)}>{SEVERITY_LABEL[i.severity]}</Badge>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* 右侧追溯 */}
        <section className="flex min-w-0 flex-1 flex-col overflow-auto">
          {!trace ? (
            <div className="grid h-full place-items-center text-sm text-ink-500">
              {loadingTrace ? '加载追溯链…' : '从左侧选择一条异常，查看完整追溯链'}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-4xl px-6 py-6">
              {/* 面包屑 */}
              <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
                <span className="mono">{trace.run.runId}</span>
                <ChevronRight className="h-3 w-3" />
                <span>异常 #{trace.issue.id}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-ink-300">{TYPE_LABEL[trace.issue.type]}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-signal-sky">权限清单 · 处理意见 · 复核历史</span>
              </div>

              {/* 异常概要 */}
              <div className="rounded-xl border border-ink-800 bg-ink-900/70 p-4 animate-fade-up">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={typeTone(trace.issue.type)} dot>{TYPE_LABEL[trace.issue.type]}</Badge>
                      <Badge tone={severityTone(trace.issue.severity)}>{SEVERITY_LABEL[trace.issue.severity]}</Badge>
                      <Badge tone={statusTone(trace.issue.status)}>{STATUS_LABEL[trace.issue.status]}</Badge>
                    </div>
                    <div className="mono mt-2 break-all text-sm text-ink-300">{issueLabel(trace.issue)}</div>
                    <div className="mt-1 text-xs text-ink-500">{trace.issue.detail}</div>
                  </div>
                  <div className="text-right text-[11px] text-ink-500">
                    <div>检测时间</div>
                    <div className="mono text-ink-300">{formatTime(trace.issue.detectedAt)}</div>
                  </div>
                </div>
                {trace.indexSuggestion?.reason && (
                  <div className="mt-3 rounded-lg border border-signal-amber/30 bg-signal-amber/5 p-3 text-xs text-ink-300">
                    <span className="font-semibold text-signal-amber">处置建议：</span>{trace.indexSuggestion.reason}
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {/* Schema 差异 */}
                <TraceCard icon={<GitCompare className="h-4 w-4 text-signal-sky" />} title="Schema 对比（本批同源 run）" tone="sky">
                  {trace.schemaDiff ? (
                    <SchemaDiffView diff={trace.schemaDiff} />
                  ) : (
                    <Empty>本异常无关联 Schema 差异记录</Empty>
                  )}
                </TraceCard>

                {/* 索引建议 */}
                <TraceCard icon={<ShieldCheck className="h-4 w-4 text-signal-violet" />} title="索引建议（本批同源 run）" tone="violet">
                  {trace.indexSuggestion ? (
                    <IndexView s={trace.indexSuggestion} />
                  ) : (
                    <Empty>本异常无关联索引建议记录</Empty>
                  )}
                </TraceCard>

                {/* 权限清单 */}
                <TraceCard icon={<KeyRound className="h-4 w-4 text-signal-amber" />} title={`权限清单（${trace.permissions.length}）`} tone="amber">
                  {trace.permissions.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-ink-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-ink-850 text-[10px] uppercase tracking-wider text-ink-500">
                          <tr>
                            <th className="px-2.5 py-1.5">账号</th>
                            <th className="px-2.5 py-1.5">主机</th>
                            <th className="px-2.5 py-1.5">权限</th>
                            <th className="px-2.5 py-1.5">授予人</th>
                          </tr>
                        </thead>
                        <tbody className="mono divide-y divide-ink-800">
                          {trace.permissions.map((p) => (
                            <tr key={p.id} className="hover:bg-ink-850/60">
                              <td className="px-2.5 py-1.5 text-ink-300">{p.dbUser}</td>
                              <td className="px-2.5 py-1.5 text-ink-400">{p.host}</td>
                              <td className="px-2.5 py-1.5 text-signal-amber">{p.privileges}</td>
                              <td className="px-2.5 py-1.5 text-ink-400">{p.grantedBy ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty>本异常无关联权限清单</Empty>
                  )}
                </TraceCard>

                {/* 处理意见 */}
                <TraceCard icon={<MessageSquareWarning className="h-4 w-4 text-signal-rose" />} title={`处理意见（${trace.handlingOpinions.length}）`} tone="rose">
                  {trace.handlingOpinions.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {trace.handlingOpinions.map((o) => (
                        <div key={o.id} className="rounded-lg border border-ink-800 bg-ink-850/50 p-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-ink-300">{o.opinionText}</span>
                            <span className="text-[10px] text-ink-500">{formatTime(o.createdAt)}</span>
                          </div>
                          <div className="mt-1 text-ink-500">{o.recommendedAction} · {o.createdBy ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty>本异常无关联处理意见</Empty>
                  )}
                </TraceCard>
              </div>

              {/* 复核历史 - 谁改的/何时/为何 */}
              <div className="mt-3 rounded-xl border border-ink-800 bg-ink-900/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-300">
                  <Clock className="h-4 w-4 text-signal-emerald" /> 复核历史（谁改的 · 何时 · 为何）
                </div>
                {trace.reviewHistory.length === 0 ? (
                  <div className="text-xs text-ink-500">暂无复核记录，复核通过后将在此留下审计轨迹。</div>
                ) : (
                  <ol className="relative ml-2 border-l border-ink-700 pl-4">
                    {trace.reviewHistory.map((h) => (
                      <HistoryRow key={h.id} h={h} />
                    ))}
                  </ol>
                )}
              </div>

              {/* 复核操作 */}
              {trace.issue.status === 'pending' && (
                <div className="mt-3 rounded-xl border border-signal-amber/30 bg-ink-900/70 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-signal-amber">
                    <User className="h-4 w-4" /> 复核操作（通过后历史将记录复核人与理由）
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      value={reviewer}
                      onChange={(e) => setReviewer(e.target.value)}
                      placeholder="复核人，如 dba_wang"
                      className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-300 outline-none placeholder:text-ink-600 focus:border-signal-sky/50"
                    />
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="复核理由 / 为什么改"
                      className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-300 outline-none placeholder:text-ink-600 focus:border-signal-sky/50"
                    />
                  </div>
                  {reviewError && <div className="mt-2 text-xs text-signal-rose">⚠ {reviewError}</div>}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleReview('approve')}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-signal-emerald/40 bg-signal-emerald/10 px-4 py-2 text-sm font-medium text-signal-emerald transition-colors hover:bg-signal-emerald/20 disabled:opacity-50"
                    >
                      <ArrowRight className="h-4 w-4" /> 通过并留痕
                    </button>
                    <button
                      onClick={() => handleReview('reject')}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-signal-rose/40 bg-signal-rose/10 px-4 py-2 text-sm font-medium text-signal-rose transition-colors hover:bg-signal-rose/20 disabled:opacity-50"
                    >
                      驳回并留痕
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}

function HistoryRow({ h }: { h: ReviewHistory }) {
  const isApprove = h.action === 'approve'
  return (
    <li className="mb-3 last:mb-0">
      <span className={cn('absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full', isApprove ? 'bg-signal-emerald' : 'bg-signal-rose')} />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone={isApprove ? 'emerald' : 'rose'}>{isApprove ? '通过' : '驳回'}</Badge>
        <span className="text-ink-300">{h.reviewer}</span>
        <span className="text-ink-500">于 {formatTime(h.changedAt)}</span>
        {h.previousStatus && <span className="text-[10px] text-ink-600">{STATUS_LABEL[h.previousStatus]} → {isApprove ? '已通过' : '已驳回'}</span>}
      </div>
      <div className="mt-1 text-xs text-ink-400">理由：{h.reason}</div>
    </li>
  )
}

function SchemaDiffView({ diff }: { diff: NonNullable<IssueTrace['schemaDiff']> }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex justify-between"><span className="text-ink-500">对象</span><span className="mono text-ink-300">{diff.objectName}</span></div>
      <div className="flex justify-between"><span className="text-ink-500">类型</span><span className="text-ink-300">{diff.objectType}</span></div>
      <div className="rounded-lg border border-ink-800 bg-ink-950 p-2.5">
        <div className="mb-1 text-[10px] uppercase text-ink-500">主库定义</div>
        <pre className="mono whitespace-pre-wrap break-all text-[11px] text-ink-300">{diff.masterDef ?? '—'}</pre>
      </div>
      <div className="rounded-lg border border-signal-rose/30 bg-signal-rose/5 p-2.5">
        <div className="mb-1 text-[10px] uppercase text-signal-rose">从库定义</div>
        <pre className="mono whitespace-pre-wrap break-all text-[11px] text-ink-300">{diff.replicaDef ?? '—'}</pre>
      </div>
      {diff.diffSummary && <div className="text-ink-400">{diff.diffSummary}</div>}
    </div>
  )
}

function IndexView({ s }: { s: NonNullable<IssueTrace['indexSuggestion']> }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex justify-between"><span className="text-ink-500">表</span><span className="mono text-ink-300">{s.tableName}</span></div>
      <div className="flex justify-between"><span className="text-ink-500">列</span><span className="mono text-ink-300">{s.columns}</span></div>
      <div className="rounded-lg border border-signal-violet/30 bg-signal-violet/5 p-2.5">
        <div className="mb-0.5 text-[10px] uppercase text-signal-violet">建议类型</div>
        <div className="mono break-all text-[11px] text-ink-300">{s.adviceType}</div>
      </div>
      {s.reason && <div className="text-ink-400">原因：{s.reason}</div>}
      {s.impact && <div className="text-ink-500">影响：{s.impact}</div>}
    </div>
  )
}

function TraceCard({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: 'sky' | 'violet' | 'amber' | 'rose'; children: React.ReactNode }) {
  const c = toneClasses(tone)
  return (
    <div className={cn('rounded-xl border bg-ink-900/70 p-4', c.border)}>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-300">{icon}{title}</div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-ink-700 px-3 py-4 text-center text-xs text-ink-500">{children}</div>
}

function issueLabel(i: Issue): string {
  const parts = [i.dbInstance, i.schemaName, i.tableName].filter(Boolean)
  return parts.length > 0 ? parts.join('.') : i.detail.slice(0, 40)
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded border px-2 py-0.5 text-[11px] transition-colors',
        active ? 'border-signal-sky/50 bg-signal-sky/15 text-signal-sky' : 'border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-300',
      )}
    >
      {children}
    </button>
  )
}

function toneClasses(tone: 'sky' | 'violet' | 'amber' | 'rose') {
  const map = {
    sky: 'border-signal-sky/30',
    violet: 'border-signal-violet/30',
    amber: 'border-signal-amber/30',
    rose: 'border-signal-rose/30',
  } as const
  return { border: map[tone] }
}
