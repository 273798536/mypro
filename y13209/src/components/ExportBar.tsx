import { useCallback } from 'react'
import { useStore, applyFilter } from '@/store'
import { Download, FileCheck, ClipboardList, CheckCircle2, AlertTriangle, Clock, Eye } from 'lucide-react'
import type { TimecodeEntry } from '@/types'

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
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

  const handleExportSummary = useCallback(() => {
    const content = exportSummary()
    downloadFile(content, `时码分账摘要_${new Date().toISOString().slice(0, 10)}.json`)
  }, [exportSummary])

  const handleExportChecklist = useCallback(() => {
    const content = exportChecklist()
    downloadFile(content, `交付清单_${new Date().toISOString().slice(0, 10)}.json`)
  }, [exportChecklist])

  const alignedCount = filtered.filter((e) => e.alignmentStatus === 'aligned').length
  const misalignedCount = filtered.filter((e) => e.alignmentStatus === 'misaligned').length
  const confirmedCount = filtered.filter((e) => e.reviewStatus === 'confirmed').length
  const allConfirmed = filtered.length > 0 && confirmedCount === filtered.length

  return (
    <div className="bg-[#16162a] border-t border-[#2a2a4a] px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">页面摘要</span>
            <span className="text-gray-300 font-mono">
              {filtered.length}条 / 对齐{alignedCount} / 异常{misalignedCount}
            </span>
          </div>
          <div className="h-4 w-px bg-[#2a2a4a]" />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">复核进度</span>
            <span className={`${allConfirmed ? 'text-emerald-400' : 'text-gray-300'} font-mono`}>
              {confirmedCount}/{filtered.length}
            </span>
            {allConfirmed && <CheckCircle2 size={12} className="text-emerald-400" />}
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
                    title={`${e.projectName} — 点击切换复核状态`}
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
          <button
            onClick={handleExportSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2a2a4a] text-gray-300 hover:bg-amber-500/10 hover:text-amber-400 border border-[#3a3a5a] hover:border-amber-500/30 transition-all"
          >
            <Download size={13} />
            导出摘要
          </button>
          <button
            onClick={handleExportChecklist}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 transition-all"
          >
            <ClipboardList size={13} />
            交付清单
          </button>
        </div>
      </div>
    </div>
  )
}
