import { useAppStore } from '@/store/useAppStore'
import { Camera, MousePointer, Map, Type, ArrowRight, Ruler, X, Download } from 'lucide-react'
import { useRef } from 'react'

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
  const clearScreenshot = useAppStore((s) => s.clearScreenshot)

  const tools = [
    { id: 'select' as const, icon: MousePointer, label: '选择' },
    { id: 'annotate_text' as const, icon: Type, label: '文字标注' },
    { id: 'annotate_arrow' as const, icon: ArrowRight, label: '箭头标注' },
    { id: 'measure' as const, icon: Ruler, label: '距离测量' },
  ]

  const handleScreenshot = () => {
    if (canvasRef.current) {
      takeScreenshot(canvasRef.current)
    }
  }

  const handleDownload = () => {
    if (latestScreenshot) {
      const link = document.createElement('a')
      link.download = `巡检路线_${new Date().toISOString().slice(0, 10)}.png`
      link.href = latestScreenshot
      link.click()
    }
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
          title="截图导出"
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
                截图预览
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
              style={{ borderColor: '#1E3A5F', maxWidth: '100%', maxHeight: '60vh' }}
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs"
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
