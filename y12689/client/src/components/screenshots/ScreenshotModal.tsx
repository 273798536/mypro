import { useEffect } from 'react'
import { X, Camera, Clock, AlertTriangle } from 'lucide-react'
import type { Screenshot } from '@/types'

interface ScreenshotModalProps {
  screenshot: Screenshot | null
  onClose: () => void
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function ScreenshotModal({ screenshot, onClose }: ScreenshotModalProps) {
  useEffect(() => {
    if (screenshot) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [screenshot, onClose])

  if (!screenshot) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-medium text-text-primary">
            截图详情 #{screenshot.order}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            className={`relative bg-bg-dark rounded-lg overflow-hidden flex items-center justify-center ${
              screenshot.hasIssue ? 'border-2 border-dashed border-danger' : ''
            }`}
            style={{ height: '400px' }}
          >
            <Camera size={48} className="text-text-muted" />
            {screenshot.hasIssue && (
              <div className="absolute inset-0 border-2 border-dashed border-danger pointer-events-none" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted block mb-1">名称</span>
              <span className="text-text-primary font-mono">截图 #{screenshot.order}</span>
            </div>
            <div>
              <span className="text-text-muted block mb-1">拍摄时间</span>
              <div className="flex items-center gap-1 text-text-secondary">
                <Clock size={14} />
                <span>{formatTimestamp(screenshot.timestamp)}</span>
              </div>
            </div>
            <div>
              <span className="text-text-muted block mb-1">ID</span>
              <span className="text-text-secondary font-mono text-xs">{screenshot.id}</span>
            </div>
            <div>
              <span className="text-text-muted block mb-1">状态</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  screenshot.hasIssue
                    ? 'bg-danger/20 text-danger border border-danger/40'
                    : 'bg-success/20 text-success border border-success/40'
                }`}
              >
                {screenshot.hasIssue ? '存在问题' : '正常'}
              </span>
            </div>
          </div>

          {screenshot.annotation && (
            <div className="pt-3 border-t border-border">
              <div className="flex items-start gap-2">
                {screenshot.hasIssue && <AlertTriangle size={16} className="text-danger mt-0.5 flex-shrink-0" />}
                <div>
                  <span className="text-text-muted block text-sm mb-1">
                    {screenshot.hasIssue ? '问题标注说明' : '标注说明'}
                  </span>
                  <p className={`text-sm ${screenshot.hasIssue ? 'text-danger' : 'text-text-secondary'}`}>
                    {screenshot.annotation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScreenshotModal
