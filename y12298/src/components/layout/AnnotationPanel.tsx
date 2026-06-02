import { useAppStore } from '@/store/useAppStore'
import type { AnnotationType } from '@/types'
import { X, Type, ArrowRight, Ruler } from 'lucide-react'

export default function AnnotationPanel() {
  const toolMode = useAppStore((s) => s.toolMode)
  const setToolMode = useAppStore((s) => s.setToolMode)
  const annotations = useAppStore((s) => s.annotations)
  const showAnnotationLayer = useAppStore((s) => s.showAnnotationLayer)
  const pendingAnnotationText = useAppStore((s) => s.pendingAnnotationText)
  const pendingArrowText = useAppStore((s) => s.pendingArrowText)
  const setPendingAnnotationText = useAppStore((s) => s.setPendingAnnotationText)
  const setPendingArrowText = useAppStore((s) => s.setPendingArrowText)
  const measurePoints = useAppStore((s) => s.measurePoints)
  const cancelAnnotation = useAppStore((s) => s.cancelAnnotation)
  const clearMeasurePoints = useAppStore((s) => s.clearMeasurePoints)

  if (toolMode === 'select') return null

  const isTextMode = toolMode === 'annotate_text'
  const isArrowMode = toolMode === 'annotate_arrow'
  const isMeasureMode = toolMode === 'measure'

  return (
    <div
      className="absolute top-20 left-4 w-64 rounded-lg border p-3 z-10"
      style={{ background: 'rgba(15, 29, 47, 0.95)', borderColor: '#1E3A5F' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium" style={{ color: '#60A5FA' }}>
          {isTextMode && '文字标注'}
          {isArrowMode && '箭头标注'}
          {isMeasureMode && '距离测量'}
        </div>
        <button
          onClick={cancelAnnotation}
          className="rounded p-1 hover:bg-white/10 transition-colors"
          style={{ color: '#94A3B8' }}
        >
          <X size={14} />
        </button>
      </div>

      {isTextMode && (
        <div className="space-y-2">
          <div className="text-[10px]" style={{ color: '#64748B' }}>
            1. 输入标注文字
          </div>
          <input
            type="text"
            value={pendingAnnotationText}
            onChange={(e) => setPendingAnnotationText(e.target.value)}
            placeholder="输入标注内容..."
            className="w-full rounded border px-2 py-1.5 text-xs"
            style={{ background: '#0F172A', borderColor: '#1E3A5F', color: '#CBD5E1' }}
            autoFocus
          />
          <div
            className="text-[10px]"
            style={{ color: pendingAnnotationText.trim() ? '#22C55E' : '#64748B' }}
          >
            2. {pendingAnnotationText.trim() ? '✓ 文字已输入，点击3D场景放置标注' : '请先输入文字'}
          </div>
        </div>
      )}

      {isArrowMode && (
        <div className="space-y-2">
          <div className="text-[10px]" style={{ color: '#64748B' }}>
            1. 输入箭头文字（可选）
          </div>
          <input
            type="text"
            value={pendingArrowText}
            onChange={(e) => setPendingArrowText(e.target.value)}
            placeholder="箭头标注..."
            className="w-full rounded border px-2 py-1.5 text-xs"
            style={{ background: '#0F172A', borderColor: '#1E3A5F', color: '#CBD5E1' }}
          />
          <div className="text-[10px]" style={{ color: '#22C55E' }}>
            2. 点击3D场景放置箭头标注
          </div>
        </div>
      )}

      {isMeasureMode && (
        <div className="space-y-2">
          <div className="text-[10px]" style={{ color: '#64748B' }}>
            点击3D场景选择两个点测量距离
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: '#F59E0B' }}>
            <Ruler size={12} />
            <span>已选点: {measurePoints.length} / 2</span>
          </div>
          {measurePoints.length > 0 && (
            <div className="space-y-1">
              {measurePoints.map((p, i) => (
                <div key={i} className="text-[10px]" style={{ color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                  点{i + 1}: ({p.x.toFixed(1)}, {p.z.toFixed(1)})
                </div>
              ))}
            </div>
          )}
          {measurePoints.length > 0 && (
            <button
              onClick={clearMeasurePoints}
              className="w-full text-[10px] underline cursor-pointer"
              style={{ color: '#F87171' }}
            >
              清除已选点
            </button>
          )}
        </div>
      )}

      {annotations.length > 0 && showAnnotationLayer && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#1E3A5F' }}>
          <div className="text-[10px] mb-2" style={{ color: '#64748B' }}>
            当前标注 ({annotations.length})
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E3A5F transparent' }}>
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className="flex items-center justify-between rounded px-2 py-1 text-[10px]"
                style={{ background: 'rgba(30, 64, 175, 0.04)' }}
              >
                <div className="flex items-center gap-1.5">
                  {ann.type === 'text' && <Type size={10} style={{ color: '#60A5FA' }} />}
                  {ann.type === 'arrow' && <ArrowRight size={10} style={{ color: '#22C55E' }} />}
                  {ann.type === 'measure' && <Ruler size={10} style={{ color: '#F59E0B' }} />}
                  <span style={{ color: '#94A3B8' }}>{ann.content.slice(0, 15)}{ann.content.length > 15 ? '...' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
