import { useState } from 'react'
import {
  Terminal,
  Upload,
  FileDown,
  Scale,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useFetch } from '@/hooks/useFetch'
import { Panel, SectionTitle, CodeBlock, Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { IoGuide, ImportResult, ReconcileResult, ExportPayload } from '../../shared/types'

const DUP_DEMO_CONTENT =
  '【脏样本·重复原版】同一知识点被切分两次的样本：安全规则在Prompt注入场景下的拦截策略说明。'

export default function IO() {
  const { data: guide } = useFetch<IoGuide>(() => api.guide())

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="IMPORT / EXPORT · 导入导出"
        title="首跑 · 重复导入 · 导出对账"
        desc="从空目录试一遍：依赖安装、启动命令、首份样例位置都要够实在。重复导入后看有没有乱，导出内容与界面摘要要对得上。"
      />

      <FirstRunGuide guide={guide} />
      <ImportPanel />
      <ExportReconcile />
    </div>
  )
}

function FirstRunGuide({ guide }: { guide: IoGuide | null }) {
  const lines = guide
    ? [
        `# 1. 安装依赖`,
        `${guide.dependency}`,
        ``,
        `# 2. 启动开发服务（前端 + 后端）`,
        `${guide.startCommand}`,
        ``,
        `# 3. 端口`,
        `前端 http://localhost:${guide.clientPort}   后端 http://localhost:${guide.serverPort}`,
        ``,
        `# 4. 首份样例`,
        `${guide.firstSample.path}   # ${guide.firstSample.importId}`,
        `# ${guide.firstSample.description}`,
        ``,
        `# 5. 数据库（首跑自动建库）`,
        guide.dbLocation,
      ]
    : []

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
        <Terminal className="h-3.5 w-3.5 text-saffron" /> 空目录首跑引导
      </div>
      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-md border border-viridian/40 bg-viridian/10 px-2 py-0.5 text-xs text-viridian">
            可直接复制
          </span>
          <span className="text-xs text-ink-400">命令已对齐当前工程，无需改动</span>
        </div>
        {guide ? <CodeBlock lines={lines} /> : <Skeleton className="h-56" />}
      </Panel>
    </div>
  )
}

function ImportPanel() {
  const [batchName, setBatchName] = useState('课前知识库·补录第2批')
  const [sourcePath, setSourcePath] = useState('data/imports/补录_2026Q2.jsonl')
  const [content, setContent] = useState(DUP_DEMO_CONTENT)
  const [evalBank, setEvalBank] = useState('KB-EVAL-Q12 命中题#7')
  const [segList, setSegList] = useState('SEG-07 清单#补')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const runImport = async () => {
    setLoading(true)
    setErr(null)
    setResult(null)
    try {
      const r = await api.doImport({
        batchName,
        sourcePath,
        items: [{ content, eval_bank: evalBank, seg_list: segList }],
      })
      setResult(r)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '导入失败')
    } finally {
      setLoading(false)
    }
  }

  const isDupDemo = content.trim() === DUP_DEMO_CONTENT.trim()

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
        <Upload className="h-3.5 w-3.5 text-saffron" /> 重复导入与补录（验证不产生两份结论）
      </div>
      <Panel>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Field label="批次名称" value={batchName} onChange={setBatchName} />
            <Field label="来源路径" value={sourcePath} onChange={setSourcePath} mono />
            <Field label="评测题库" value={evalBank} onChange={setEvalBank} />
            <Field label="切分清单" value={segList} onChange={setSegList} />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-400">
              切片内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-lg border border-ink-700 bg-ink-950/80 p-3 font-mono text-sm text-paper outline-none focus:border-saffron/50"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setContent(DUP_DEMO_CONTENT)}
                className="rounded-md border border-saffron/40 bg-saffron/10 px-2.5 py-1 text-xs text-saffron hover:bg-saffron/20"
              >
                填入重复脏样本
              </button>
              {isDupDemo && (
                <span className="flex items-center gap-1 text-xs text-saffron">
                  <AlertCircle className="h-3.5 w-3.5" />
                  内容与 SLC-1003 碰撞，将触发去重归并
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={runImport}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-sm font-medium text-ink-950 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            执行导入
          </button>
          {err && <span className="text-xs text-brick">{err}</span>}
        </div>

        {result && (
          <div className="mt-4 rounded-lg border border-ink-700/60 bg-ink-950/50 p-4">
            <div className="mb-3 grid grid-cols-3 gap-3 text-center">
              <ResultStat label="新增" value={result.imported} tone="text-viridian" />
              <ResultStat label="重复归并" value={result.duplicated} tone="text-saffron" />
              <ResultStat label="冲突" value={result.conflicts.length} tone="text-brick" />
            </div>
            {result.conflicts.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
                  冲突明细（已归并，仅保留单一结论）
                </div>
                {result.conflicts.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-ink-700/60 bg-ink-900/60 px-3 py-1.5 font-mono text-xs"
                  >
                    <span className="text-ink-300">{c.incoming}</span>
                    <ChevronRight className="h-3 w-3 text-ink-500" />
                    <span className="text-brick">重复</span>
                    <ChevronRight className="h-3 w-3 text-ink-500" />
                    <span className="text-saffron">归并至 {c.existing}</span>
                  </div>
                ))}
              </div>
            )}
            {result.duplicated > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-viridian">
                <CheckCircle2 className="h-3.5 w-3.5" />
                去重归一完成：同一内容未产生新结论，已指向原片。
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  )
}

function ExportReconcile() {
  const { data: exportData, loading: exportLoading } = useFetch<ExportPayload>(() => api.exportData())
  const { data: reconcile, loading: reconLoading } = useFetch<ReconcileResult>(() => api.reconcile())

  const download = () => {
    if (!exportData) return
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `切片质检导出_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
        <Scale className="h-3.5 w-3.5 text-saffron" /> 导出与对账（页面摘要 vs 文件内容）
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-paper">导出文件</h3>
            <button
              onClick={download}
              disabled={!exportData}
              className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-saffron/50 hover:text-saffron disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" /> 下载 JSON
            </button>
          </div>
          {exportLoading || !exportData ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="space-y-1.5">
              <div className="font-mono text-[11px] text-ink-500">
                generatedAt: {exportData.generatedAt}
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                <ExportRow label="总切片数" value={exportData.summary.total} />
                <ExportRow label="通过" value={exportData.summary.pass} />
                <ExportRow label="待确认" value={exportData.summary.pending} />
                <ExportRow label="坏记录" value={exportData.summary.bad} />
                <ExportRow label="脏样本重复" value={exportData.summary.badTypeCounts.dirty_dup} />
                <ExportRow
                  label="安全规则漏配"
                  value={exportData.summary.badTypeCounts.secure_misconfig}
                />
                <ExportRow label="去重条数" value={exportData.summary.dedup.dedupCount} />
              </div>
              <div className="mt-2 font-mono text-[11px] text-ink-500">
                含 {exportData.records.length} 条切片明细记录
              </div>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-paper">对账结果</h3>
            {reconcile && (
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs',
                  reconcile.match
                    ? 'border-viridian/40 bg-viridian/10 text-viridian'
                    : 'border-brick/50 bg-brick/10 text-brick',
                )}
              >
                {reconcile.match ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {reconcile.match ? '完全一致' : '存在差异'}
              </span>
            )}
          </div>
          {reconLoading || !reconcile ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="overflow-hidden rounded-lg border border-ink-700/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-ink-850 font-mono text-[11px] uppercase tracking-wider text-ink-400">
                  <tr>
                    <th className="px-3 py-2">字段</th>
                    <th className="px-3 py-2">页面摘要</th>
                    <th className="px-3 py-2">文件内容</th>
                    <th className="px-3 py-2 text-center">一致</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-700/50">
                  {reconcile.items.map((it, i) => (
                    <tr key={i} className="font-mono">
                      <td className="px-3 py-2 text-ink-300">{it.field}</td>
                      <td className="px-3 py-2 text-paper">{it.uiValue}</td>
                      <td className="px-3 py-2 text-paper">{it.fileValue}</td>
                      <td className="px-3 py-2 text-center">
                        {it.match ? (
                          <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-viridian" />
                        ) : (
                          <AlertCircle className="mx-auto h-3.5 w-3.5 text-brick" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 font-mono text-[11px] text-ink-500">
            导出内容与界面摘要逐项对齐，不会出现页面说通过、文件里又写待确认。
          </p>
        </Panel>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
}) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-400">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-lg border border-ink-700 bg-ink-950/80 px-3 py-2 text-sm text-paper outline-none focus:border-saffron/50',
          mono && 'font-mono',
        )}
      />
    </div>
  )
}

function ResultStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-ink-700/60 bg-ink-900/60 py-2">
      <div className={cn('stat-num text-2xl', tone)}>{value}</div>
      <div className="font-mono text-[11px] text-ink-400">{label}</div>
    </div>
  )
}

function ExportRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-ink-700/40 bg-ink-950/40 px-2.5 py-1">
      <span className="text-ink-400">{label}</span>
      <span className="flex items-center gap-1 text-paper">
        <Copy className="h-3 w-3 text-ink-600" />
        {value}
      </span>
    </div>
  )
}
