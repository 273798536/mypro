import { useState, useCallback } from 'react'
import {
  Camera,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Box,
  Trash2,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { RenderMode, CameraState } from '@/types'

const RENDER_MODES: { value: RenderMode; label: string }[] = [
  { value: 'solid', label: '实体' },
  { value: 'wireframe', label: '线框' },
  { value: 'xray', label: 'X光' },
]

export default function Toolbar() {
  const renderMode = useAppStore((s) => s.renderMode)
  const setRenderMode = useAppStore((s) => s.setRenderMode)
  const showBones = useAppStore((s) => s.showBones)
  const showImplants = useAppStore((s) => s.showImplants)
  const showAnnotations = useAppStore((s) => s.showAnnotations)
  const toggleLayer = useAppStore((s) => s.toggleLayer)
  const savedViews = useAppStore((s) => s.savedViews)
  const saveCurrentView = useAppStore((s) => s.saveCurrentView)
  const loadView = useAppStore((s) => s.loadView)
  const deleteView = useAppStore((s) => s.deleteView)
  const setCameraTarget = useAppStore((s) => s.setCameraTarget)
  const caseData = useAppStore((s) => s.caseData)

  const [viewName, setViewName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [showViewList, setShowViewList] = useState(false)

  const handleSaveView = useCallback(() => {
    if (!viewName.trim()) return
    const camera: CameraState = {
      position: [5, 3, 8],
      target: [0, 1.5, 0],
    }
    saveCurrentView(viewName.trim(), camera)
    setViewName('')
    setShowSaveInput(false)
  }, [viewName, saveCurrentView])

  const handleResetView = useCallback(() => {
    setCameraTarget({
      position: [5, 3, 8],
      target: [0, 1.5, 0],
    })
  }, [setCameraTarget])

  const layers = [
    { key: 'bones' as const, label: '骨骼', active: showBones },
    { key: 'implants' as const, label: '植入物', active: showImplants },
    { key: 'annotations' as const, label: '标注', active: showAnnotations },
  ]

  return (
    <div className="h-10 bg-med-dark-2/80 border-b border-med-border/30 flex items-center px-4 gap-3 shrink-0">
      <div className="flex items-center gap-2 mr-2">
        <div className="w-2 h-2 rounded-full bg-med-blue animate-pulse" />
        <span className="text-xs font-display font-semibold text-med-text">
          骨科植入物匹配台
        </span>
        <span className="text-[10px] font-mono text-med-text-dim ml-1">
          {caseData.name} · {caseData.patientId}
        </span>
      </div>

      <div className="w-px h-5 bg-med-border/40" />

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-med-text-dim mr-1">渲染</span>
        {RENDER_MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => setRenderMode(mode.value)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
              renderMode === mode.value
                ? 'bg-med-blue/20 text-med-blue border border-med-blue/30'
                : 'text-med-text-dim hover:text-med-text border border-transparent'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-med-border/40" />

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-med-text-dim mr-1">图层</span>
        {layers.map((layer) => (
          <button
            key={layer.key}
            onClick={() => toggleLayer(layer.key)}
            className={`p-1 rounded transition-all ${
              layer.active
                ? 'text-med-blue'
                : 'text-med-text-dim/40 hover:text-med-text-dim'
            }`}
            title={layer.label}
          >
            {layer.active ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-med-border/40" />

      <div className="flex items-center gap-1">
        <button
          onClick={handleResetView}
          className="p-1 rounded text-med-text-dim hover:text-med-blue transition-colors"
          title="重置视角"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSaveInput(!showSaveInput)}
            className="p-1 rounded text-med-text-dim hover:text-med-green transition-colors"
            title="保存视角"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          {showSaveInput && (
            <div className="absolute top-full left-0 mt-1 bg-med-dark-2 border border-med-border rounded p-2 flex gap-1 z-50 shadow-lg">
              <input
                type="text"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
                placeholder="视角名称"
                className="bg-med-dark-3 border border-med-border rounded px-2 py-1 text-xs text-med-text w-24 outline-none focus:border-med-blue"
                autoFocus
              />
              <button
                onClick={handleSaveView}
                className="px-2 py-1 bg-med-blue/20 text-med-blue rounded text-xs hover:bg-med-blue/30"
              >
                保存
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowViewList(!showViewList)}
            className="p-1 rounded text-med-text-dim hover:text-med-blue transition-colors"
            title="加载视角"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          {showViewList && savedViews.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-med-dark-2 border border-med-border rounded p-1.5 min-w-[160px] z-50 shadow-lg">
              {savedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-med-dark-3 rounded cursor-pointer group"
                >
                  <Box className="w-3 h-3 text-med-blue shrink-0" />
                  <span
                    className="text-xs text-med-text flex-1"
                    onClick={() => {
                      loadView(view.id)
                      setShowViewList(false)
                    }}
                  >
                    {view.name}
                  </span>
                  <span className="text-[9px] text-med-text-dim font-mono">
                    {view.createdAt}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteView(view.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-med-text-dim hover:text-med-red transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
