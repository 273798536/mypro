import { Camera, Download, X } from 'lucide-react'
import { useStore } from '@/store/index'

export function ScreenshotExport() {
  const screenshotPreview = useStore((s) => s.screenshotPreview)
  const setScreenshotPreview = useStore((s) => s.setScreenshotPreview)
  const clearScreenshotPreview = useStore((s) => s.clearScreenshotPreview)
  const addAuditEntry = useStore((s) => s.addAuditEntry)
  const timeline = useStore((s) => s.timeline)

  const handleCapture = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    setScreenshotPreview(dataUrl)
    addAuditEntry({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action: '截图导出',
      parameter: 'canvas',
      oldValue: null,
      newValue: `声部覆盖图_${new Date().toISOString()}.png`,
      snapshotUrl: dataUrl,
    })
  }

  const handleDownload = () => {
    if (!screenshotPreview) return
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `声部覆盖图_${ts}.png`
    const a = document.createElement('a')
    a.href = screenshotPreview
    a.download = filename
    a.click()
  }

  return (
    <>
      <button
        onClick={handleCapture}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/50 text-amber-400 transition-all hover:bg-amber-400/10 hover:shadow-[0_0_12px_rgba(251,191,36,0.3)]"
        title="截图导出"
      >
        <Camera size={16} />
      </button>

      {screenshotPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full mx-4 rounded-xl border border-white/10 bg-[#0a0e1a] p-4 shadow-2xl">
            <button
              onClick={clearScreenshotPreview}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/60 transition-all hover:text-white hover:border-white/40"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-medium text-amber-400 mb-3">截图预览</h3>

            <div className="rounded-lg overflow-hidden border border-white/10 mb-4">
              <img
                src={screenshotPreview}
                alt="截图预览"
                className="w-full h-auto"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 font-mono">
                时间: {timeline.currentTime.toFixed(1)}s
              </span>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/40 px-4 py-2 text-sm text-amber-400 transition-all hover:bg-amber-400/20 hover:shadow-[0_0_12px_rgba(251,191,36,0.3)]"
              >
                <Download size={14} />
                下载截图
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
