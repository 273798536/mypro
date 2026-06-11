import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { generateMarkdownReport, downloadMarkdown, reportFileName } from '@/utils/report'
import StatusBadge from '@/components/StatusBadge'
import type { CashFlowRecord } from '@/types'

export default function ReportPage() {
  const records = useStore(s => s.records)
  const logs = useStore(s => s.logs)
  const markReportExported = useStore(s => s.markReportExported)
  const addLog = useStore(s => s.addLog)
  const navigate = useNavigate()

  const { generatedAt, markdown } = useMemo(() => {
    const t = new Date().toISOString()
    return { generatedAt: t, markdown: generateMarkdownReport(records, logs, t) }
  }, [records, logs])

  function handleExport() {
    downloadMarkdown(reportFileName(generatedAt), markdown)
    markReportExported()
    addLog('report_export', `预览页导出 Markdown 报告（${records.length} 条记录）`)
  }

  const confirmed = records.filter(r => r.baseStatus === 'confirmed').length
  const pending = records.filter(r => r.baseStatus === 'pending').length
  const withdrawn = records.filter(r => r.baseStatus === 'withdrawn').length
  const reversal = records.filter(r => r.isReversal).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-ink-700 hover:text-ink-900 hover:bg-ink-800/5 rounded transition-colors"
        >
          <ArrowLeft size={16} />
          返回主控面板
        </button>
        <div className="flex-1">
          <h2 className="font-serif text-2xl font-bold text-ink-900">Markdown 报告</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            报告内容与页面当前状态实时一致，可在线预览或导出 .md 文件
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-sm hover:bg-slate-50"
        >
          <RefreshCw size={14} />
          刷新
        </button>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-success text-white rounded text-sm hover:bg-success/90 shadow-sm"
        >
          <Download size={16} />
          下载 .md 文件
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ConsistencyItem label="页面已确认" count={confirmed} kind="confirmed" />
        <ConsistencyItem label="页面待确认" count={pending} kind="pending" />
        <ConsistencyItem label="页面已撤回" count={withdrawn} kind="withdrawn" />
        <ConsistencyItem label="页面冲正" count={reversal} kind="reversal" />
      </div>

      <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-sm font-medium text-slate-700">报告预览（与页面数据一致）</span>
          <span className="text-xs text-slate-500 font-mono">
            生成时间：{generatedAt.slice(0, 19).replace('T', ' ')}
          </span>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <article className="prose-report max-w-none">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </article>
        </div>
      </div>

      <details className="bg-white rounded border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700 select-none">
          查看原始 Markdown 文本
        </summary>
        <pre className="mt-3 text-xs bg-slate-50 p-4 rounded overflow-x-auto font-mono text-slate-700 whitespace-pre-wrap break-words">
          {markdown}
        </pre>
      </details>
    </div>
  )
}

function ConsistencyItem({ label, count, kind }: { label: string; count: number; kind: 'confirmed' | 'pending' | 'withdrawn' | 'reversal' }) {
  const demoRecord: CashFlowRecord = {
    id: 'demo',
    batchNo: 'DEMO',
    amount: 0,
    baseStatus: kind === 'reversal' ? 'pending' : kind,
    isReversal: kind === 'reversal',
    status: kind === 'reversal' ? 'reversal' : kind,
    source: '',
    note: '',
    importBatch: '',
    importedAt: '',
    version: 1,
  }
  return (
    <div className="bg-white rounded border border-slate-200 px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-xl font-serif font-bold text-ink-800 mt-0.5">{count}</div>
      </div>
      <StatusBadge record={demoRecord} />
    </div>
  )
}
