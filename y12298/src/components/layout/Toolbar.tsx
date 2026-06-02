import { useAppStore } from '@/store/useAppStore'
import { Camera, MousePointer, Map, Type, ArrowRight, Ruler, X, Download, Link } from 'lucide-react'

interface ToolbarProps {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>
}

export default function Toolbar({ canvasRef }: ToolbarProps) {
  const toolMode = useAppStore((s) => s.toolMode)
  const setToolMode = useAppStore((s) => s.setToolMode)
  const isDrawingRoute = useAppStore((s) => s.isDrawingRoute)
  const startDrawingRoute = useAppStore((s) => s.startDrawingRoute)
  const cancelDrawingRoute = useAppStore((s) => s.cancelDrawingRoute)
  const takeScreenshot = useAppStore((s) => s.takeScreenshot)
  const latestScreenshot = useAppStore((s) => s.latestScreenshot)
  const latestScreenshotWithWatermark = useAppStore((s) => s.latestScreenshotWithWatermark)
  const screenshotMetadata = useAppStore((s) => s.screenshotMetadata)
  const clearScreenshot = useAppStore((s) => s.clearScreenshot)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const setActivePanelTab = useAppStore((s) => s.setActivePanelTab)

  const tools = [
    { id: 'select' as const, icon: MousePointer, label: '选择' },
    { id: 'annotate_text' as const, icon: Type, label: '文字标注' },
    { id: 'annotate_arrow' as const, icon: ArrowRight, label: '箭头标注' },
    { id: 'measure' as const, icon: Ruler, label: '距离测量' },
  ]

  const handleScreenshot = () => {
    if (canvasRef.current) {
      takeScreenshot(canvasRef.current)
    } else {
      const canvas = document.querySelector('canvas')
      if (canvas) {
        takeScreenshot(canvas)
      }
    }
  }

  const handleDownload = () => {
    if (latestScreenshotWithWatermark && screenshotMetadata) {
      const link = document.createElement('a')
      const ver = screenshotMetadata.routeVersion.replace(/[^a-zA-Z0-9._-]/g, '_')
      const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
      link.download = `巡检截图_${ver}_${ts}.png`
      link.href = latestScreenshotWithWatermark
      link.click()
    }
  }

  const handleViewEvidence = () => {
    clearScreenshot()
    setActiveView('evidence')
    setActivePanelTab('workorder')
  }

  return (
    <>
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-lg border"
        style={{ background: 'rgba(15, 29, 47, 0.95)', borderColor: '#1E3A5F' }}
      >
        <div className="flex items-center gap-0.5">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setToolMode(tool.id)}
              disabled={isDrawingRoute}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded transition-colors ${
                toolMode === tool.id ? 'bg-blue-500/20' : 'hover:bg-white/5'
              } ${isDrawingRoute ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              title={tool.label}
              style={{ color: toolMode === tool.id ? '#60A5FA' : '#94A3B8' }}
            >
              <tool.icon size={16} />
              <span className="text-[9px]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-6 mx-1" style={{ background: '#1E3A5F' }} />

        <button
          onClick={isDrawingRoute ? cancelDrawingRoute : startDrawingRoute}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded transition-colors cursor-pointer ${
            isDrawingRoute ? 'bg-red-500/20' : 'hover:bg-white/5'
          }`}
          title={isDrawingRoute ? '取消绘制' : '绘制路线'}
          style={{ color: isDrawingRoute ? '#F87171' : '#94A3B8' }}
        >
          {isDrawingRoute ? <X size={16} /> : <Map size={16} />}
          <span className="text-[9px]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {isDrawingRoute ? '取消' : '绘制'}
          </span>
        </button>

        <div className="w-px h-6 mx-1" style={{ background: '#1E3A5F' }} />

        <button
          onClick={handleScreenshot}
          disabled={isDrawingRoute}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded transition-colors ${
            isDrawingRoute ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'
          }`}
          title="截图导出（含水印，自动留存证据链）"
          style={{ color: '#94A3B8' }}
        >
          <Camera size={16} />
          <span className="text-[9px]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>截图</span>
        </button>
      </div>

      {isDrawingRoute && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md text-xs"
          style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', border: '1px solid #3B82F6' }}
        >
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>绘制模式</span>
          <span className="ml-2" style={{ color: '#94A3B8' }}>点击管廊节点添加路线点</span>
        </div>
      )}

      {latestScreenshot && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div
            className="rounded-lg border p-3 max-w-3xl max-h-[80vh] overflow-auto"
            style={{ background: '#0F1D2F', borderColor: '#1E3A5F' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium" style={{ color: '#60A5FA' }}>
                截图预览（已叠加水印并留存证据链）
              </div>
              <button
                onClick={clearScreenshot}
                className="rounded p-1 hover:bg-white/10 transition-colors"
                style={{ color: '#94A3B8' }}
              >
                <X size={16} />
              </button>
            </div>

            <img
              src={latestScreenshot}
              alt="Screenshot"
              className="rounded border"
              style={{ borderColor: '#1E3A5F', maxWidth: '100%', maxHeight: '55vh' }}
            />

            {screenshotMetadata && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded px-2 py-0.5 text-[10px]" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}>
                  {screenshotMetadata.routeVersion}
                </span>
                <span className="rounded px-2 py-0.5 text-[10px]" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22C55E', fontFamily: 'JetBrains Mono, monospace' }}>
                  {screenshotMetadata.viewMode}
                </span>
                {screenshotMetadata.layers.map((l) => (
                  <span key={l} className="rounded px-2 py-0.5 text-[10px]" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
                    {l}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <button
                onClick={handleViewEvidence}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs cursor-pointer"
                style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' }}
              >
                <Link size={12} />
                查看证据链
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs cursor-pointer"
                style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}
              >
                <Download size={12} />
                下载 PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
