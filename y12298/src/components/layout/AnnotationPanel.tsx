import { useAppStore } from '@/store/useAppStore'
import type { AnnotationType } from '@/types'
import { X, Plus, Type, ArrowRight, Ruler, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function AnnotationPanel() {
  const toolMode = useAppStore((s) => s.toolMode)
  const setToolMode = useAppStore((s) => s.setToolMode)
  const annotations = useAppStore((s) => s.annotations)
  const addAnnotation = useAppStore((s) => s.addAnnotation)
  const showAnnotationLayer = useAppStore((s) => s.showAnnotationLayer)

  const [newText, setNewText] = useState('')
  const [measurePoints, setMeasurePoints] = useState<{ x: number; z: number }[]>([])

  const tools: { id: AnnotationType; icon: any; label: string }[] = [
    { id: 'text', icon: Type, label: '文字' },
    { id: 'arrow', icon: ArrowRight, label: '箭头' },
    { id: 'measure', icon: Ruler, label: '测距' },
  ]

  const handleAddTextAnnotation = () => {
    if (!newText.trim()) return

    const newAnnotation = {
      id: `ann-${Date.now()}`,
      type: 'text' as const,
      position: [6, 1, 0] as [number, number, number],
      content: newText,
      color: '#60A5FA',
      author: '当前用户',
      createdAt: new Date().toISOString(),
    }

    addAnnotation(newAnnotation)
    setNewText('')
    setToolMode('select')
  }

  const handleAddMeasureAnnotation = () => {
    const newAnnotation = {
      id: `ann-${Date.now()}`,
      type: 'measure' as const,
      position: [8, 0.5, 3] as [number, number, number],
      content: '距离: 5.2m',
      color: '#F59E0B',
      author: '当前用户',
      createdAt: new Date().toISOString(),
    }

    addAnnotation(newAnnotation)
    setToolMode('select')
  }

  const handleAddArrowAnnotation = () => {
    const newAnnotation = {
      id: `ann-${Date.now()}`,
      type: 'arrow' as const,
      position: [4, 1, -2] as [number, number, number],
      content: '重点巡检',
      color: '#22C55E',
      author: '当前用户',
      createdAt: new Date().toISOString(),
    }

    addAnnotation(newAnnotation)
    setToolMode('select')
  }

  if (toolMode === 'select') return null

  return (
    <div
      className="absolute top-20 left-4 w-64 rounded-lg border p-3 z-10"
      style={{ background: 'rgba(15, 29, 47, 0.95)', borderColor: '#1E3A5F' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium" style={{ color: '#60A5FA' }}>
          {toolMode === 'annotate_text' && '文字标注'}
          {toolMode === 'annotate_arrow' && '箭头标注'}
          {toolMode === 'measure' && '距离测量'}
        </div>
        <button
          onClick={() => setToolMode('select')}
          className="rounded p-1 hover:bg-white/10 transition-colors"
          style={{ color: '#94A3B8' }}
        >
          <X size={14} />
        </button>
      </div>

      {toolMode === 'annotate_text' && (
        <div className="space-y-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="输入标注内容..."
            className="w-full rounded border px-2 py-1.5 text-xs"
            style={{ background: '#0F172A', borderColor: '#1E3A5F', color: '#CBD5E1' }}
          />
          <button
            onClick={handleAddTextAnnotation}
            disabled={!newText.trim()}
            className={`flex w-full items-center justify-center gap-1 rounded py-1.5 text-xs ${
              newText.trim() ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
            }`}
            style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}
          >
            <Plus size={12} />
            添加标注
          </button>
        </div>
      )}

      {toolMode === 'annotate_arrow' && (
        <div className="space-y-2">
          <div className="text-[10px]" style={{ color: '#64748B' }}>
            点击场景位置添加箭头标注
          </div>
          <button
            onClick={handleAddArrowAnnotation}
            className="flex w-full items-center justify-center gap-1 rounded py-1.5 text-xs cursor-pointer"
            style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' }}
          >
            <Plus size={12} />
            示例箭头
          </button>
        </div>
      )}

      {toolMode === 'measure' && (
        <div className="space-y-2">
          <div className="text-[10px]" style={{ color: '#64748B' }}>
            点击两个点测量距离
          </div>
          <button
            onClick={handleAddMeasureAnnotation}
            className="flex w-full items-center justify-center gap-1 rounded py-1.5 text-xs cursor-pointer"
            style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' }}
          >
            <Plus size={12} />
            示例测量
          </button>
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
