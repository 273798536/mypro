import { useMemo } from 'react'
import { Camera, FileSpreadsheet, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useReviewStore } from '@/store/reviewStore'

interface ExportActionsProps {
  exportFormat: 'pdf' | 'excel'
  onScreenshotPreview?: () => void
  onExportExcel?: () => void
  onExportPdf?: () => void
  loadingScreenshot?: boolean
  loadingExcel?: boolean
  loadingPdf?: boolean
}

export function ExportActions({
  exportFormat,
  onScreenshotPreview,
  onExportExcel,
  onExportPdf,
  loadingScreenshot,
  loadingExcel,
  loadingPdf,
}: ExportActionsProps) {
  const filteredPhotos = useReviewStore((s) => s.filteredPhotos)
  const getReviewByPhotoId = useReviewStore((s) => s.getReviewByPhotoId)

  const photoList = filteredPhotos()

  const anomalyCount = useMemo(() => {
    return photoList.filter((photo) => {
      const review = getReviewByPhotoId(photo.id)
      return review && review.anomalyType !== 'none'
    }).length
  }, [photoList, getReviewByPhotoId])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-gray-600">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            共 <span className="font-semibold text-gray-900">{photoList.length}</span> 条记录
          </span>
          <span className="flex items-center gap-1.5 text-gray-600">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            异常 <span className="font-semibold text-orange-600">{anomalyCount}</span> 条
          </span>
          <span className="text-xs text-gray-400">
            导出格式：<span className="font-medium text-gray-600">{exportFormat.toUpperCase()}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onScreenshotPreview}
            disabled={loadingScreenshot}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingScreenshot ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            {loadingScreenshot ? '截图中' : '截图预览'}
          </button>
          <button
            onClick={onExportExcel}
            disabled={loadingExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingExcel ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            {loadingExcel ? '导出中...' : '导出 Excel'}
          </button>
          <button
            onClick={onExportPdf}
            disabled={loadingPdf}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {loadingPdf ? '导出中...' : '导出 PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
