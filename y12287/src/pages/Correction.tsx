import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, RotateCcw } from 'lucide-react'
import DentalViewer from '@/components/DentalViewer'
import SideBySideViewer from '@/components/SideBySideViewer'
import { useStore } from '@/store/useStore'
import type { ContactPoint, CorrectionRecord } from '@/types'

export default function Correction() {
  const navigate = useNavigate()
  const {
    contactPoints,
    corrections,
    dataGaps,
    selectedTooth,
    showHeatmap,
    addCorrection,
    updateContactPoint,
    setSelectedTooth,
  } = useStore()

  const [viewMode, setViewMode] = useState<'edit' | 'compare'>('edit')
  const [localEdits, setLocalEdits] = useState<Map<string, { x: number; y: number; z: number }>>(new Map())

  const handlePointDrag = useCallback((id: string, x: number, y: number, z: number) => {
    setLocalEdits((prev) => {
      const next = new Map(prev)
      next.set(id, { x, y, z })
      return next
    })
  }, [])

  const correctedPoints: ContactPoint[] = contactPoints.map((cp) => {
    const edit = localEdits.get(cp.id)
    if (edit) {
      return { ...cp, positionX: edit.x, positionY: edit.y, positionZ: edit.z }
    }
    return cp
  })

  const originalPoints = contactPoints

  const correctionRecords: CorrectionRecord[] = Array.from(localEdits.entries()).map(([id, pos], idx) => {
    const original = contactPoints.find((cp) => cp.id === id)
    return {
      id: `cr-${idx}`,
      contactPointId: id,
      originalX: original?.positionX ?? 0,
      originalY: original?.positionY ?? 0,
      originalZ: original?.positionZ ?? 0,
      correctedX: pos.x,
      correctedY: pos.y,
      correctedZ: pos.z,
      timestamp: new Date().toISOString(),
    }
  })

  const handleSave = () => {
    localEdits.forEach((pos, id) => {
      const original = contactPoints.find((cp) => cp.id === id)
      if (original) {
        addCorrection({
          id: `cr-${Date.now()}-${id}`,
          contactPointId: id,
          originalX: original.positionX,
          originalY: original.positionY,
          originalZ: original.positionZ,
          correctedX: pos.x,
          correctedY: pos.y,
          correctedZ: pos.z,
          timestamp: new Date().toISOString(),
        })
        updateContactPoint(id, pos.x, pos.y, pos.z)
      }
    })
    navigate('/')
  }

  const handleReset = () => {
    setLocalEdits(new Map())
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary">
      <div className="flex items-center justify-between px-4 py-2 bg-bg-surface/80 backdrop-blur-sm border-b border-mono-dim/20">
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-mono-muted hover:text-mono hover:bg-bg-elevated transition-colors"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4" />
            返回评审
          </button>
          <div className="w-px h-5 bg-mono-dim/30" />
          <h1 className="text-sm font-semibold text-mono">手动修正</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'edit'
                ? 'bg-upper/20 text-upper border border-upper/30'
                : 'text-mono-muted hover:text-mono hover:bg-bg-elevated border border-mono-dim/20'
            }`}
            onClick={() => setViewMode('edit')}
          >
            编辑模式
          </button>
          <button
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'compare'
                ? 'bg-lower/20 text-lower border border-lower/30'
                : 'text-mono-muted hover:text-mono hover:bg-bg-elevated border border-mono-dim/20'
            }`}
            onClick={() => setViewMode('compare')}
          >
            新旧对比
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-mono-muted hover:text-mono hover:bg-bg-elevated transition-colors border border-mono-dim/20"
            onClick={handleReset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置修正
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-lower/20 text-lower border border-lower/40 hover:bg-lower/30 transition-colors"
            onClick={handleSave}
            disabled={localEdits.size === 0}
          >
            <Save className="w-3.5 h-3.5" />
            保存修正 ({localEdits.size})
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {viewMode === 'edit' ? (
          <DentalViewer
            showHeatmap={showHeatmap}
            selectedTooth={selectedTooth}
            onSelectTooth={setSelectedTooth}
            viewMode="free"
            contactPoints={contactPoints}
            dataGaps={dataGaps}
            editable
            onPointDrag={handlePointDrag}
          />
        ) : (
          <SideBySideViewer
            originalPoints={originalPoints}
            correctedPoints={correctedPoints}
            corrections={correctionRecords}
          />
        )}

        {localEdits.size > 0 && viewMode === 'edit' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-bg-surface/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-overlap/30 shadow-lg max-w-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-overlap">已修改 {localEdits.size} 个咬合点</span>
            </div>
            <div className="space-y-1">
              {Array.from(localEdits.entries()).map(([id, pos]) => {
                const original = contactPoints.find((cp) => cp.id === id)
                return (
                  <div key={id} className="flex items-center gap-3 text-[10px]">
                    <span className="font-tooth-number text-mono">#{original?.toothNumber}</span>
                    <span className="text-mono-dim">
                      ({original?.positionX.toFixed(2)}, {original?.positionY.toFixed(2)}, {original?.positionZ.toFixed(2)})
                    </span>
                    <span className="text-overlap">→</span>
                    <span className="font-tooth-number text-lower">
                      ({pos.x.toFixed(2)}, {pos.y.toFixed(2)}, {pos.z.toFixed(2)})
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-mono-dim mt-2">切换"新旧对比"查看并排视图</p>
          </div>
        )}
      </div>
    </div>
  )
}
