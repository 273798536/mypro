import { useState, useRef } from 'react'
import type { MistakeRecord } from '../types'
import { exportMistakeAsImage, verifyExportConsistency, type ExportMetadata } from '../utils/export'

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLElement> | null
  mistake: MistakeRecord
}

export default function ExportButton({ targetRef, mistake }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)
  const [lastExport, setLastExport] = useState<{ filename: string; metadata: ExportMetadata } | null>(null)
  const lastExportRef = useRef(lastExport)
  lastExportRef.current = lastExport

  const handleExport = async () => {
    if (!targetRef?.current) return

    setExporting(true)
    setLastExport(null)
    try {
      const result = await exportMistakeAsImage(targetRef.current, mistake)
      const consistency = verifyExportConsistency(mistake, result.metadata)

      if (!consistency.valid) {
        console.warn('导出一致性警告:', consistency.issues)
      }

      setLastExport(result)
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={exporting || !targetRef}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={lastExport ? `上次导出: ${lastExport.filename}` : '导出当前页面为图片，文件名包含状态、单位校验等关键信息'}
      >
        {exporting ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            导出中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出截图
          </>
        )}
      </button>
      {lastExport && (
        <span className="text-xs text-success-600 hidden sm:inline-flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {lastExport.filename}
        </span>
      )}
    </div>
  )
}
