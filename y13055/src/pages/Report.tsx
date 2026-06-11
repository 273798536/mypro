import { useRef, useState } from 'react'
import { FileText, X, Download } from 'lucide-react'
import { ReportFilter } from '@/components/report/ReportFilter'
import { ReportPreview } from '@/components/report/ReportPreview'
import { ExportActions } from '@/components/report/ExportActions'
import { useReviewStore } from '@/store/reviewStore'
import { ANOMALY_CALIBER } from '@/data/caliber'
import {
  captureElement,
  exportElementAsPdf,
  exportRecordsAsExcel,
  formatExportDate,
  downloadDataUrl,
  type ExportPhotoRecord,
} from '@/utils/exportUtils'
import type { ReviewStatus } from '@/types'

function Report() {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf')
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [loadingScreenshot, setLoadingScreenshot] = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)

  const reportRef = useRef<HTMLDivElement>(null)

  const filteredPhotos = useReviewStore((s) => s.filteredPhotos)
  const getReviewByPhotoId = useReviewStore((s) => s.getReviewByPhotoId)
  const materials = useReviewStore((s) => s.materials)

  const handleScreenshotPreview = async () => {
    try {
      setLoadingScreenshot(true)
      const element = reportRef.current
      if (!element) {
        throw new Error('无法获取报告元素')
      }
      const dataUrl = await captureElement(element)
      setScreenshotPreviewUrl(dataUrl)
      setShowPreviewModal(true)
    } catch (error) {
      alert('截图失败：' + (error as Error).message)
    } finally {
      setLoadingScreenshot(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setLoadingExcel(true)
      const photos = filteredPhotos()
      const records: ExportPhotoRecord[] = photos
        .map((photo) => {
          const review = getReviewByPhotoId(photo.id)
          if (!review) return null
          const material = materials.find((m) => m.id === review.materialId)
          const statusMap: Record<ReviewStatus, string> = {
            pending: '待复核',
            need_evidence: '需补证据',
            reviewed: '已复核',
          }
          return {
            id: photo.id,
            name: photo.name,
            floor: photo.floorNormalized,
            floorRaw: photo.floorRaw,
            coordinate: `(${photo.coordinateX}, ${photo.coordinateY})`,
            coordinateSystem: `坐标系 ${photo.coordinateSystem}`,
            materialName: material?.name ?? '',
            anomalyType: ANOMALY_CALIBER[review.anomalyType].label,
            anomalyDescription: ANOMALY_CALIBER[review.anomalyType].description,
            status: statusMap[review.status],
            reviewNote: review.reviewNote,
            updatedAt: review.updatedAt,
          }
        })
        .filter((r): r is ExportPhotoRecord => r !== null)

      exportRecordsAsExcel(records, `复核报告-${formatExportDate()}.xlsx`)
    } catch (error) {
      alert('导出 Excel 失败：' + (error as Error).message)
    } finally {
      setLoadingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    try {
      setLoadingPdf(true)
      const element = reportRef.current
      if (!element) {
        throw new Error('无法获取报告元素')
      }
      await exportElementAsPdf(element, `复核报告-${formatExportDate()}.pdf`, {
        format: 'a4',
        orientation: 'portrait',
        backgroundColor: '#ffffff',
      })
    } catch (error) {
      alert('导出 PDF 失败：' + (error as Error).message)
    } finally {
      setLoadingPdf(false)
    }
  }

  const handleDownloadImage = () => {
    if (screenshotPreviewUrl) {
      downloadDataUrl(screenshotPreviewUrl, `复核报告-${formatExportDate()}.png`)
    }
  }

  const handleCloseModal = () => {
    setShowPreviewModal(false)
    setScreenshotPreviewUrl(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">复核报告导出</h1>
            <p className="text-sm text-gray-500">配置筛选条件，预览并导出复核报告</p>
          </div>
        </div>

        <ReportFilter
          exportFormat={exportFormat}
          onExportFormatChange={setExportFormat}
        />

        <ReportPreview ref={reportRef} />
      </div>

      <ExportActions
        exportFormat={exportFormat}
        onScreenshotPreview={handleScreenshotPreview}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        loadingScreenshot={loadingScreenshot}
        loadingExcel={loadingExcel}
        loadingPdf={loadingPdf}
      />

      {showPreviewModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">截图预览</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载图片
                </button>
                <button
                  onClick={handleCloseModal}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {screenshotPreviewUrl && (
                <img
                  src={screenshotPreviewUrl}
                  alt="报告截图预览"
                  className="w-full h-auto"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Report
