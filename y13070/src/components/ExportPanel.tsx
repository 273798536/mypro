import { useState } from 'react'
import { FileDown, X, Eye } from 'lucide-react'
import { useReviewStore } from '@/store'
import { generateHandoverHtml, downloadHtmlFile } from '@/utils/handoverExport'

export default function ExportPanel() {
  const handoverItems = useReviewStore((s) => s.handoverItems)
  const handoverReports = useReviewStore((s) => s.handoverReports)
  const points = useReviewStore((s) => s.points)
  const coordSystems = useReviewStore((s) => s.coordSystems)
  const stations = useReviewStore((s) => s.stations)
  const annotations = useReviewStore((s) => s.annotations)
  const annotationNotes = useReviewStore((s) => s.annotationNotes)
  const screenshotArchives = useReviewStore((s) => s.screenshotArchives)
  const filter = useReviewStore((s) => s.filter)
  const getRoundStats = useReviewStore((s) => s.getRoundStats)
  const currentRoundId = useReviewStore((s) => s.currentRoundId)
  const reviewRounds = useReviewStore((s) => s.reviewRounds)

  const [showPreview, setShowPreview] = useState(false)

  const currentRound = reviewRounds.find((r) => r.id === currentRoundId)
  const report = handoverReports[0]
  const stats = getRoundStats()

  const buildExportData = () => {
    const visibleItems = handoverItems

    return {
      title: report?.title || '山地索道站空间复核交接报告',
      generatedAt: new Date().toLocaleString('zh-CN'),
      filter,
      stats,
      handoverItems: visibleItems,
      points,
      coordSystems,
      stations,
      annotations,
      annotationNotes,
      screenshotArchives,
      currentRoundName: currentRound?.name || '未知轮次',
    }
  }

  const handlePreview = () => {
    setShowPreview(true)
  }

  const handleDownload = () => {
    const data = buildExportData()
    const html = generateHandoverHtml(data)
    const dateStr = new Date().toISOString().slice(0, 10)
    downloadHtmlFile(html, `山地索道站交接报告_${dateStr}.html`)
  }

  const previewHtml = showPreview ? generateHandoverHtml(buildExportData()) : ''

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          onClick={handlePreview}
        >
          <Eye size={16} />
          预览报告
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          onClick={handleDownload}
        >
          <FileDown size={16} />
          导出交接文档
        </button>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 flex h-[85vh] w-full max-w-5xl flex-col rounded-xl bg-slate-800 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">交接文档预览</h3>
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 transition-colors"
                  onClick={handleDownload}
                >
                  <FileDown size={14} />
                  下载
                </button>
                <button
                  className="text-slate-400 hover:text-white"
                  onClick={() => setShowPreview(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={previewHtml}
                title="交接报告预览"
                className="h-full w-full bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
