import Scene3D from '@/components/Scene3D'
import ObjectProperties from '@/components/ObjectProperties'
import CollisionList from '@/components/CollisionList'
import TimelinePanel from '@/components/TimelinePanel'
import FilterPanel from '@/components/FilterPanel'
import { useStore } from '@/store/useStore'
import { X, Camera, Download } from 'lucide-react'
import { exportSingleObject } from '@/utils/export'
import type { ScreenshotMark } from '@/types'

function determineLabelType(collisionCount: number, annotationCount: number): ScreenshotMark['labelType'] {
  if (annotationCount > 5) return 'resolved'
  if (annotationCount > 0) return 'pending_material'
  if (collisionCount > 0) return 'manual_override'
  return 'pending_material'
}

export default function SceneReview() {
  const selectedObjectId = useStore((s) => s.selectedObjectId)
  const setSelectedObjectId = useStore((s) => s.setSelectedObjectId)
  const selectedCollisionId = useStore((s) => s.selectedCollisionId)
  const getBarById = useStore((s) => s.getBarById)
  const getAnnotationsByCollisionId = useStore((s) => s.getAnnotationsByCollisionId)
  const getCollisionsByObjectId = useStore((s) => s.getCollisionsByObjectId)
  const getBarPositionAtFrame = useStore((s) => s.getBarPositionAtFrame)
  const addScreenshot = useStore((s) => s.addScreenshot)
  const currentFrame = useStore((s) => s.currentFrame)
  const selectedBar = selectedObjectId ? getBarById(selectedObjectId) : null
  const selectedAnnotations = selectedCollisionId ? getAnnotationsByCollisionId(selectedCollisionId) : (selectedObjectId ? useStore.getState().getCollisionsByObjectId(selectedObjectId).flatMap(c => useStore.getState().getAnnotationsByCollisionId(c.id)) : [])

  const handleExportCurrent = async () => {
    if (!selectedBar || !selectedObjectId) return
    const collisions = getCollisionsByObjectId(selectedObjectId)
    const currentCollision = collisions.find(c => c.frameIndex === currentFrame) || collisions[0] || null
    const annotations = currentCollision ? getAnnotationsByCollisionId(currentCollision.id) : []
    const labelType = determineLabelType(collisions.length, annotations.length)
    const note = currentCollision
      ? `碰撞间距 ${currentCollision.distance}m · ${collisions.length} 处碰撞记录 · ${annotations.length} 条批注`
      : `当前帧无碰撞 · 共 ${collisions.length} 处碰撞记录 · ${annotations.length} 条批注`
    const posY = getBarPositionAtFrame(selectedObjectId, currentFrame)
    const imageData = await exportSingleObject(
      selectedBar, posY, currentCollision, annotations, labelType, note, currentFrame
    )
    if (imageData) {
      const now = Date.now()
      addScreenshot({
        id: `scr-${now}`,
        collisionId: currentCollision?.id || `col-${selectedObjectId}-F${currentFrame}`,
        objectId: selectedObjectId,
        imageData,
        label: `${selectedBar.name} - 帧${currentFrame}`,
        labelType,
        note,
        timestamp: now,
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <FilterPanel />
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <Scene3D />
          {selectedBar && (
            <div className="absolute top-3 left-3 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700/50 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${selectedBar.type === 'scenery' ? 'bg-amber-700' : 'bg-amber-400'}`} />
              <span className="text-xs text-zinc-200 font-medium">{selectedBar.name}</span>
              <button onClick={() => setSelectedObjectId(null)} className="p-0.5 rounded hover:bg-zinc-700/50 text-zinc-500">
                <X size={12} />
              </button>
            </div>
          )}
          {selectedBar && (
            <button
              onClick={handleExportCurrent}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-400 text-xs font-medium hover:bg-amber-400/30 border border-amber-400/30 transition-colors"
            >
              <Download size={12} /> 导出当前对象
            </button>
          )}
          {selectedAnnotations.length > 0 && (
            <div className="absolute bottom-3 left-3 max-w-xs bg-zinc-900/90 backdrop-blur-sm border border-zinc-700/50 rounded-lg p-3">
              <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Camera size={10} /> 关联批注
              </h4>
              {selectedAnnotations.slice(0, 2).map(ann => (
                <div key={ann.id} className="text-xs text-zinc-300 mb-1">
                  <span className="text-zinc-500">{ann.authorName}:</span> {ann.content.slice(0, 40)}...
                </div>
              ))}
              {selectedAnnotations.length > 2 && (
                <div className="text-[10px] text-amber-400">还有 {selectedAnnotations.length - 2} 条批注</div>
              )}
            </div>
          )}
        </div>

        <div className="w-72 border-l border-zinc-800 bg-zinc-900/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <ObjectProperties />
          </div>
          <div className="border-t border-zinc-800 p-3 overflow-y-auto max-h-[40%]">
            <CollisionList />
          </div>
        </div>
      </div>
      <TimelinePanel />
    </div>
  )
}
