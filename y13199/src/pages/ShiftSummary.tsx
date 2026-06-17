import { useMemo, useState, useCallback } from 'react'
import { CheckCircle2, FileQuestion, UserCheck, BarChart3, Download } from 'lucide-react'
import { useReportStore } from '../store/reportStore'
import ReportCard from '../components/ReportCard'
import type { ReportStatus } from '../types'
import { REPORT_STATUS_LABELS } from '../types'
import { exportAllAsJson } from '../utils/exportReport'

const STATUS_CONFIG: Record<ReportStatus, { icon: typeof CheckCircle2; color: string; bgColor: string; borderColor: string }> = {
  processed: { icon: CheckCircle2, color: 'text-[#2D9B83]', bgColor: 'bg-[#2D9B83]/5', borderColor: 'border-[#2D9B83]/20' },
  pending_material: { icon: FileQuestion, color: 'text-[#E8A838]', bgColor: 'bg-[#E8A838]/5', borderColor: 'border-[#E8A838]/20' },
  manual_override: { icon: UserCheck, color: 'text-[#C44D3F]', bgColor: 'bg-[#C44D3F]/5', borderColor: 'border-[#C44D3F]/20' },
}

export default function ShiftSummary() {
  const { reports } = useReportStore()
  const [exportMsg, setExportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleExportAll = useCallback(() => {
    if (reports.length === 0) {
      setExportMsg({ type: 'error', text: '当前没有任何报告可导出' })
      window.setTimeout(() => setExportMsg(null), 3000)
      return
    }
    try {
      exportAllAsJson(reports)
      setExportMsg({ type: 'success', text: `已导出 ${reports.length} 份报告为 JSON 文件` })
    } catch (err) {
      setExportMsg({ type: 'error', text: `导出失败：${err instanceof Error ? err.message : String(err)}` })
    }
    window.setTimeout(() => setExportMsg(null), 3000)
  }, [reports])

  const grouped = useMemo(() => {
    const processed = reports.filter((r) => r.status === 'processed')
    const pending = reports.filter((r) => r.status === 'pending_material')
    const manual = reports.filter((r) => r.status === 'manual_override')
    return { processed, pending, manual }
  }, [reports])

  const totalCount = reports.length

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1B3A5C]">排班摘要</h2>
          <p className="mt-1 text-sm text-[#5A7A9A]">按状态分类查看所有滑轮组张力报告</p>
        </div>
        <button
          onClick={handleExportAll}
          disabled={reports.length === 0}
          className="flex items-center gap-2 rounded-lg border border-[#1B3A5C]/15 bg-white px-4 py-2 text-sm font-medium text-[#1B3A5C] transition-all hover:bg-[#F8FAFB] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          导出全部报告
        </button>
      </div>

      {exportMsg && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
            exportMsg.type === 'success'
              ? 'border-[#2D9B83]/30 bg-[#2D9B83]/10 text-[#2D9B83]'
              : 'border-[#C44D3F]/30 bg-[#C44D3F]/10 text-[#C44D3F]'
          }`}
          role="status"
        >
          {exportMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <UserCheck className="h-4 w-4" />
          )}
          {exportMsg.text}
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-4">
        {(['processed', 'pending_material', 'manual_override'] as ReportStatus[]).map((status) => {
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          const count = grouped[status === 'processed' ? 'processed' : status === 'pending_material' ? 'pending' : 'manual'].length
          const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(0) : '0'

          return (
            <div key={status} className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`h-6 w-6 ${config.color}`} />
                  <div>
                    <p className="text-xs text-[#5A7A9A]">{REPORT_STATUS_LABELS[status]}</p>
                    <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5 text-[#8BA3BF]" />
                    <span className="text-sm font-medium text-[#5A7A9A]">{pct}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/50">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    status === 'processed' ? 'bg-[#2D9B83]' : status === 'pending_material' ? 'bg-[#E8A838]' : 'bg-[#C44D3F]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#2D9B83]" />
            <h3 className="text-sm font-semibold text-[#1B3A5C]">已处理</h3>
            <span className="rounded-full bg-[#2D9B83]/10 px-2 py-0.5 text-[10px] font-bold text-[#2D9B83]">
              {grouped.processed.length}
            </span>
          </div>
          <div className="space-y-3">
            {grouped.processed.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#1B3A5C]/15 py-8 text-center text-xs text-[#8BA3BF]">
                暂无已处理报告
              </p>
            ) : (
              grouped.processed.map((r) => <ReportCard key={r.id} report={r} />)
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <FileQuestion className="h-4 w-4 text-[#E8A838]" />
            <h3 className="text-sm font-semibold text-[#1B3A5C]">待补材料</h3>
            <span className="rounded-full bg-[#E8A838]/10 px-2 py-0.5 text-[10px] font-bold text-[#E8A838]">
              {grouped.pending.length}
            </span>
          </div>
          <div className="space-y-3">
            {grouped.pending.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#1B3A5C]/15 py-8 text-center text-xs text-[#8BA3BF]">
                暂无待补材料
              </p>
            ) : (
              grouped.pending.map((r) => <ReportCard key={r.id} report={r} />)
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#C44D3F]" />
            <h3 className="text-sm font-semibold text-[#1B3A5C]">人工改判</h3>
            <span className="rounded-full bg-[#C44D3F]/10 px-2 py-0.5 text-[10px] font-bold text-[#C44D3F]">
              {grouped.manual.length}
            </span>
          </div>
          <div className="space-y-3">
            {grouped.manual.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#1B3A5C]/15 py-8 text-center text-xs text-[#8BA3BF]">
                暂无人工改判
              </p>
            ) : (
              grouped.manual.map((r) => <ReportCard key={r.id} report={r} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
