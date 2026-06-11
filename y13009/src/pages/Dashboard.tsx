import { useState } from 'react'
import { Upload, RefreshCw, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatsCards from '@/components/StatsCards'
import CashFlowTable from '@/components/CashFlowTable'
import Timeline from '@/components/Timeline'
import ImportModal from '@/components/ImportModal'
import { useStore } from '@/store/useStore'
import { generateMarkdownReport, downloadMarkdown, reportFileName } from '@/utils/report'

export default function Dashboard() {
  const [importOpen, setImportOpen] = useState(false)
  const records = useStore(s => s.records)
  const logs = useStore(s => s.logs)
  const rerun = useStore(s => s.rerun)
  const addLog = useStore(s => s.addLog)
  const markReportExported = useStore(s => s.markReportExported)
  const navigate = useNavigate()

  function handleRerun() {
    if (!confirm('确定执行重跑？所有未撤回记录将重置为「待确认」状态，已撤回记录保持不变。')) return
    rerun()
  }

  function handleExport() {
    const generatedAt = new Date().toISOString()
    const content = generateMarkdownReport(records, logs, generatedAt)
    downloadMarkdown(reportFileName(generatedAt), content)
    markReportExported()
    addLog('report_export', `导出 Markdown 报告（${records.length} 条记录）`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink-900">主控面板</h2>
          <p className="text-sm text-slate-500 mt-0.5">统一管理 ABS 现金流审批材料，材料变更全程留痕</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink-800 text-white rounded text-sm hover:bg-ink-900 active:translate-y-px transition-all shadow-sm"
          >
            <Upload size={16} />
            导入审批邮件
          </button>
          <button
            onClick={handleRerun}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-ink-800 border border-ink-800/30 rounded text-sm hover:bg-ink-800/5 active:translate-y-px transition-all"
          >
            <RefreshCw size={16} />
            重跑全部
          </button>
          <button
            onClick={() => navigate('/report')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-ink-800 border border-ink-800/30 rounded text-sm hover:bg-ink-800/5 active:translate-y-px transition-all"
          >
            <FileText size={16} />
            查看报告
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-success text-white rounded text-sm hover:bg-success/90 active:translate-y-px transition-all shadow-sm"
          >
            <FileText size={16} />
            导出 Markdown
          </button>
        </div>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CashFlowTable />
        </div>
        <div className="lg:col-span-1">
          <Timeline />
        </div>
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
