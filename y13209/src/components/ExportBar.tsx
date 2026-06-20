import { useCallback } from 'react'
import { useStore, applyFilter } from '@/store'
import { Download, ClipboardList, CheckCircle2, AlertTriangle, Clock, Eye, FileJson, FileSpreadsheet } from 'lucide-react'
import type { TimecodeEntry } from '@/types'

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function reviewStatusIcon(status: TimecodeEntry['reviewStatus']) {
  switch (status) {
    case 'confirmed':
      return <CheckCircle2 size={14} className="text-emerald-400" />
    case 'flagged':
      return <AlertTriangle size={14} className="text-orange-400" />
    case 'in_review':
      return <Eye size={14} className="text-blue-400" />
    default:
      return <Clock size={14} className="text-gray-500" />
  }
}

function reviewStatusLabel(status: TimecodeEntry['reviewStatus']) {
  const map: Record<string, string> = {
    unreviewed: '未复核',
    in_review: '复核中',
    confirmed: '已通过',
    flagged: '待确认',
  }
  return map[status] || status
}

export default function ExportBar() {
  const { entries, filter, exportSummary, exportChecklist, updateReviewStatus } = useStore()
  const filtered = applyFilter(entries, filter)
  const today = new Date().toISOString().slice(0, 10)

  const handleExportSummaryJson = useCallback(() => {
    const content = exportSummary('json')
    downloadFile(
      content,
      `时码分账摘要_${today}.json`,
      'application/json;charset=utf-8'
    )
  }, [exportSummary, today])

  const handleExportSummaryCsv = useCallback(() => {
    const content = exportSummary('csv')
    downloadFile(
      content,
      `时码分账摘要_${today}.csv`,
      'text/csv;charset=utf-8'
    )
  }, [exportSummary, today])

  const handleExportChecklistJson = useCallback(() => {
    const content = exportChecklist('json')
    downloadFile(
      content,
      `交付清单_${today}.json`,
      'application/json;charset=utf-8'
    )
  }, [exportChecklist, today])

  const handleExportChecklistCsv = useCallback(() => {
    const content = exportChecklist('csv')
    downloadFile(
      content,
      `交付清单_${today}.csv`,
      'text/csv;charset=utf-8'
    )
  }, [exportChecklist, today])

  const alignedCount = filtered.filter((e) => e.alignmentStatus === 'aligned').length
  const misalignedCount = filtered.filter((e) => e.alignmentStatus === 'misaligned').length
  const confirmedCount = filtered.filter((e) => e.reviewStatus === 'confirmed').length
  const allConfirmed = filtered.length > 0 && confirmedCount === filtered.length

  const totalRemarks = filtered.reduce((sum, e) => sum + e.remarks.length, 0)
  const totalShots = filtered.reduce((sum, e) => sum + e.screenshots.length, 0)
  const supShots = filtered.reduce(
    (sum, e) => sum + e.screenshots.filter((s) => s.isSupplementary).length,
    0
  )

  return (
    <div className="bg-[#16162a] border-t border-[#2a2a4a] px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">页面摘要</span>
            <span className="text-gray-300 font-mono">
              {filtered.length}条 / 对齐{alignedCount} / 异常{misalignedCount}
            </span>
          </div>
          <div className="h-4 w-px bg-[#2a2a4a]" />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">复核进度</span>
            <span
              className={`${
                allConfirmed ? 'text-emerald-400' : 'text-gray-300'
              } font-mono`}
            >
              {confirmedCount}/{filtered.length}
            </span>
            {allConfirmed && <CheckCircle2 size={12} className="text-emerald-400" />}
          </div>
          <div className="h-4 w-px bg-[#2a2a4a]" />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>备注{totalRemarks}条</span>
            <span className="text-gray-700">·</span>
            <span>截图{totalShots}张</span>
            {supShots > 0 && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-amber-500">补{supShots}</span>
              </>
            )}
          </div>

          {filtered.length > 0 && !allConfirmed && (
            <>
              <div className="h-4 w-px bg-[#2a2a4a]" />
              <div className="flex items-center gap-1.5">
                {filtered.slice(0, 6).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      const next: TimecodeEntry['reviewStatus'] =
                        e.reviewStatus === 'unreviewed'
                          ? 'in_review'
                          : e.reviewStatus === 'in_review'
                          ? 'confirmed'
                          : e.reviewStatus === 'flagged'
                          ? 'in_review'
                          : 'unreviewed'
                      updateReviewStatus(e.id, next)
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#2a2a4a] hover:bg-[#3a3a5a] transition-colors"
                    title={`${e.projectName} — 点击切换复核状态 (当前: ${reviewStatusLabel(
                      e.reviewStatus
                    )})`}
                  >
                    {reviewStatusIcon(e.reviewStatus)}
                    <span className="text-gray-400">{e.projectName.slice(0, 4)}</span>
                  </button>
                ))}
                {filtered.length > 6 && (
                  <span className="text-[10px] text-gray-600">+{filtered.length - 6}</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportSummaryJson}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-lg text-xs font-medium bg-[#2a2a4a] text-gray-300 hover:bg-amber-500/10 hover:text-amber-400 border border-[#3a3a5a] hover:border-amber-500/30 border-r-0 transition-all"
              title="导出完整 JSON（含全部历史快照，适合程序读取/归档）"
            >
              <FileJson size={12} />
              摘要 JSON
            </button>
            <button
              onClick={handleExportSummaryCsv}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-r-lg text-xs font-medium bg-[#2a2a4a] text-gray-300 hover:bg-amber-500/10 hover:text-amber-400 border border-[#3a3a5a] hover:border-amber-500/30 transition-all"
              title="导出 CSV（Excel/Numbers 可直接打开）"
            >
              <FileSpreadsheet size={12} />
              CSV
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleExportChecklistJson}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-lg text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 border-r-0 transition-all"
              title="交付清单 JSON（含复核要点、历史索引，复核人专用）"
            >
              <ClipboardList size={12} />
              交付清单 JSON
            </button>
            <button
              onClick={handleExportChecklistCsv}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-r-lg text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 transition-all"
              title="交付清单 CSV（Excel/Numbers 可直接打开）"
            >
              <FileSpreadsheet size={12} />
              CSV
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-gray-600 flex items-center gap-2">
        <Download size={10} />
        JSON 含完整历史快照（备注内容/版本、截图文件名/补充标记、每次重扫描快照）；CSV 可直接用 Excel 打开。导出内容与当前页面筛选、历史抽屉完全一致。
      </div>
    </div>
  )
}
