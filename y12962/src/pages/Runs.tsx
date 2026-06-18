import { useEffect, useState } from 'react'
import { Download, Boxes, Terminal, GitCompare, Unplug, KeyRound, Timer, FileText, Copy, Check } from 'lucide-react'
import { api, type RunDetail } from '@/lib/api'
import { useStore } from '@/store/useStore'
import { Layout } from '@/components/Layout'
import { Badge } from '@/components/Badge'
import { cn } from '@/lib/utils'
import { formatTime, shortRun } from '@/lib/ui'
import type { SchemaDiff, IndexSuggestion } from '@shared/types'

export default function Runs() {
  const { runs, selectedRunId, loadRuns, selectRun, ensureSelected } = useStore()
  const [detail, setDetail] = useState<RunDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { loadRuns() }, [loadRuns])
  useEffect(() => { ensureSelected() }, [ensureSelected])
  const activeRunId = selectedRunId ?? runs[0]?.runId ?? null

  useEffect(() => {
    if (!activeRunId) return
    setLoading(true)
    api.getRun(activeRunId).then(setDetail).finally(() => setLoading(false))
  }, [activeRunId])

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-ink-500">
              <Boxes className="h-3.5 w-3.5" /> 批处理与下载
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-ink-300">批处理记录 · 报告下载</h1>
            <p className="mt-1 text-sm text-ink-500">同一 run_id 下的 schema 对比、索引建议、延迟与权限清单为同一批记录，界面与下载报告同源。</p>
          </div>
        </div>

        {/* 运行列表 */}
        <div className="mt-5 rounded-xl border border-ink-800 bg-ink-900/70">
          <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-300"><FileText className="h-4 w-4 text-signal-sky" /> 历史运行</div>
            <div className="text-[11px] text-ink-500">点击行切换查看同批记录</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink-850/60 text-[10px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-2">Run ID</th>
                  <th className="px-4 py-2">开始时间</th>
                  <th className="px-4 py-2">数据源</th>
                  <th className="px-4 py-2 text-center">延迟</th>
                  <th className="px-4 py-2 text-center">Schema</th>
                  <th className="px-4 py-2 text-center">索引</th>
                  <th className="px-4 py-2 text-center">异常</th>
                  <th className="px-4 py-2 text-center">状态</th>
                  <th className="px-4 py-2 text-right">下载报告</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {runs.map((r) => {
                  const active = r.runId === activeRunId
                  return (
                    <tr
                      key={r.runId}
                      onClick={() => selectRun(r.runId)}
                      className={cn('cursor-pointer transition-colors', active ? 'bg-signal-sky/10' : 'hover:bg-ink-850/50')}
                    >
                      <td className="mono px-4 py-2.5 text-ink-300" title={r.runId}>{shortRun(r.runId)}</td>
                      <td className="px-4 py-2.5 text-ink-400">{formatTime(r.startedAt)}</td>
                      <td className="px-4 py-2.5 text-ink-400">{r.sourceDb}</td>
                      <td className="mono px-4 py-2.5 text-center text-ink-300">{r.delayCount}</td>
                      <td className="mono px-4 py-2.5 text-center text-ink-300">{r.schemaDiffCount}</td>
                      <td className="mono px-4 py-2.5 text-center text-ink-300">{r.indexSuggestionCount}</td>
                      <td className="mono px-4 py-2.5 text-center text-signal-amber">{r.issueCount}</td>
                      <td className="px-4 py-2.5 text-center">
                        {r.status === 'completed' ? <Badge tone="emerald" dot>完成</Badge> : <Badge tone="amber" dot>采集中</Badge>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <a
                          href={api.downloadUrl(r.runId)}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-850 px-2.5 py-1 text-[11px] text-ink-300 transition-colors hover:border-signal-sky/40 hover:text-signal-sky"
                        >
                          <Download className="h-3 w-3" /> .txt
                        </a>
                      </td>
                    </tr>
                  )
                })}
                {runs.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-500">暂无运行记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 同批记录 */}
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-300">
            <Boxes className="h-4 w-4 text-signal-emerald" />
            同批处理记录 · <span className="mono text-xs text-signal-sky">{activeRunId}</span>
            <Badge tone="emerald">界面与报告共用</Badge>
          </div>
          {loading ? (
            <div className="rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-8 text-center text-xs text-ink-500">加载中…</div>
          ) : detail ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <SharedCard icon={<Timer className="h-4 w-4 text-signal-sky" />} title={`延迟实例（${detail.delays.length}）`} tone="sky">
                <div className="space-y-1.5">
                  {detail.delays.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <span className="mono text-ink-300">{d.dbInstance}</span>
                      <span className={cn('mono', d.delaySeconds > d.thresholdSeconds ? 'text-signal-rose' : 'text-ink-400')}>
                        {d.delaySeconds.toFixed(1)}s / 阈值 {d.thresholdSeconds}s
                      </span>
                    </div>
                  ))}
                  {detail.delays.length === 0 && <div className="text-ink-500">无延迟采集</div>}
                </div>
              </SharedCard>

              <SharedCard icon={<GitCompare className="h-4 w-4 text-signal-sky" />} title={`Schema 差异（${detail.schemaDiffs.length}）`} tone="sky">
                <div className="space-y-2">
                  {detail.schemaDiffs.map((d) => <DiffRow key={d.id} diff={d} />)}
                  {detail.schemaDiffs.length === 0 && <div className="text-ink-500">无 Schema 差异</div>}
                </div>
              </SharedCard>

              <SharedCard icon={<Unplug className="h-4 w-4 text-signal-violet" />} title={`索引建议（${detail.indexSuggestions.length}）`} tone="violet">
                <div className="space-y-2">
                  {detail.indexSuggestions.map((s) => <IndexRow key={s.id} s={s} />)}
                  {detail.indexSuggestions.length === 0 && <div className="text-ink-500">无索引建议</div>}
                </div>
              </SharedCard>

              <SharedCard icon={<KeyRound className="h-4 w-4 text-signal-amber" />} title={`权限快照（${detail.run.delayCount > 0 ? '本批' : '—'}）`} tone="amber">
                <div className="text-xs text-ink-500">
                  权限清单随异常追溯链展示。在「复核中心」选择索引失效/锁等待异常即可查看对应权限。
                </div>
              </SharedCard>
            </div>
          ) : null}
        </div>

        {/* curl / 脚本示例 */}
        <div className="mt-5 rounded-xl border border-ink-800 bg-ink-900/70">
          <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-2.5 text-sm font-medium text-ink-300">
            <Terminal className="h-4 w-4 text-signal-emerald" /> 从空目录跑通流程 · curl 与脚本示例
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
            <CodeBlock
              title="1. 安装并启动"
              copied={copied === 'setup'}
              onCopy={() => copyText('setup', SETUP_CMD)}
              code={SETUP_CMD}
            />
            <CodeBlock
              title="2. 查看最近两批运行（本次 vs 上次）"
              copied={copied === 'latest'}
              onCopy={() => copyText('latest', LATEST_CMD)}
              code={LATEST_CMD}
            />
            <CodeBlock
              title="3. 触发新一批巡检"
              copied={copied === 'trigger'}
              onCopy={() => copyText('trigger', TRIGGER_CMD)}
              code={TRIGGER_CMD}
            />
            <CodeBlock
              title="4. 复核锁等待异常并留痕（谁/为何）"
              copied={copied === 'review'}
              onCopy={() => copyText('review', REVIEW_CMD)}
              code={REVIEW_CMD}
            />
            <CodeBlock
              title="5. 顺着异常追溯权限与处理意见"
              copied={copied === 'trace'}
              onCopy={() => copyText('trace', TRACE_CMD)}
              code={TRACE_CMD}
            />
            <CodeBlock
              title="6. 下载报告（文件名含 run_id 可区分）"
              copied={copied === 'download'}
              onCopy={() => copyText('download', DOWNLOAD_CMD)}
              code={DOWNLOAD_CMD}
            />
          </div>
        </div>
      </div>
    </Layout>
  )
}

function SharedCard({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: 'sky' | 'violet' | 'amber'; children: React.ReactNode }) {
  const borderMap = { sky: 'border-signal-sky/30', violet: 'border-signal-violet/30', amber: 'border-signal-amber/30' } as const
  return (
    <div className={cn('rounded-xl border bg-ink-900/70 p-4', borderMap[tone])}>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-300">{icon}{title}</div>
      {children}
    </div>
  )
}

function DiffRow({ diff }: { diff: SchemaDiff }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950 p-2 text-xs">
      <div className="mb-1 flex items-center justify-between">
        <span className="mono text-ink-300">{diff.objectType} · {diff.objectName}</span>
      </div>
      <div className="mono truncate text-[11px] text-signal-rose" title={diff.replicaDef ?? ''}>从库: {diff.replicaDef ?? '—'}</div>
    </div>
  )
}

function IndexRow({ s }: { s: IndexSuggestion }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950 p-2 text-xs">
      <div className="mono text-ink-300">{s.tableName}</div>
      <div className="mono truncate text-[11px] text-signal-violet" title={s.columns}>列: {s.columns}</div>
      <div className="mono truncate text-[11px] text-signal-amber" title={s.adviceType}>建议: {s.adviceType}</div>
    </div>
  )
}

function CodeBlock({ title, code, copied, onCopy }: { title: string; code: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950">
      <div className="flex items-center justify-between border-b border-ink-800 px-3 py-1.5">
        <div className="text-[11px] font-medium text-ink-400">{title}</div>
        <button onClick={onCopy} className="inline-flex items-center gap-1 text-[11px] text-ink-500 transition-colors hover:text-signal-sky">
          {copied ? <><Check className="h-3 w-3" />已复制</> : <><Copy className="h-3 w-3" />复制</>}
        </button>
      </div>
      <pre className="mono overflow-x-auto px-3 py-2.5 text-[11px] leading-relaxed text-ink-300">{code}</pre>
    </div>
  )
}

const SETUP_CMD = `# 从空目录开始
npx degit Trae-Solo/react-express-ts rwsplit-dashboard
cd rwsplit-dashboard
npm install --prefer-offline --no-fund --no-audit
npm run dev          # 前端 :5173 + 后端 :3001
# 首次打开自动注入示例数据，无需造表`

const LATEST_CMD = `curl -s http://localhost:3001/api/runs/latest | jq .
# 返回 current / previous / summary，本次与上次可对比`

const TRIGGER_CMD = `curl -s -X POST http://localhost:3001/api/runs \\
  -H 'Content-Type: application/json' \\
  -d '{"sourceDb":"rw-cluster-prod"}' | jq .`

const REVIEW_CMD = `# 复核 issue #4（锁等待过长）通过并留痕
curl -s -X POST http://localhost:3001/api/issues/4/review \\
  -H 'Content-Type: application/json' \\
  -d '{"action":"approved","reviewer":"dba_wang","reason":"已暂停 payment_settle_batch 定时任务"}' | jq .`

const TRACE_CMD = `# 顺着异常 #4 追溯权限清单 + 处理意见 + 复核历史
curl -s http://localhost:3001/api/issues/4 | jq .`

const DOWNLOAD_CMD = `# 文件名形如 rwsplit_report_<run_id>_<timestamp>.txt
curl -sOJ http://localhost:3001/api/download/run-20260618-103000-c3d4
# 本次与上次运行靠 run_id 区分，内容同源`
