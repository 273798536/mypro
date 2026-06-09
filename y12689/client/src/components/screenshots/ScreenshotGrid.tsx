import { Camera, Clock } from 'lucide-react'
import type { Screenshot } from '@/types'

interface ScreenshotGridProps {
  screenshots: Screenshot[]
  onScreenshotClick: (screenshot: Screenshot) => void
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function ScreenshotGrid({ screenshots, onScreenshotClick }: ScreenshotGridProps) {
  if (!screenshots || screenshots.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
        <Camera size={32} className="mx-auto text-text-muted mb-2" />
        <p className="text-sm text-text-muted">暂无截图数据</p>
      </div>
    )
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
    >
      {screenshots.map((screenshot) => (
        <div
          key={screenshot.id}
          onClick={() => onScreenshotClick(screenshot)}
          className="bg-bg-card border border-border rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:border-primary hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
        >
          <div className="relative aspect-video bg-bg-dark flex items-center justify-center overflow-hidden">
            <Camera size={36} className="text-text-muted" />
            {screenshot.hasIssue && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-danger rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                !
              </div>
            )}
          </div>

          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary truncate">
                #{screenshot.order} 截图
              </span>
              {screenshot.hasIssue && (
                <span className="text-xs text-danger">有问题</span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-text-muted">
              <Clock size={12} />
              <span>{formatTimestamp(screenshot.timestamp)}</span>
            </div>

            {screenshot.annotation && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-text-secondary line-clamp-2">{screenshot.annotation}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ScreenshotGrid
