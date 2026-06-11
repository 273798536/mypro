import { useState, useRef } from 'react'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/useToast'
import type { ReviewSnapshot, Hotspot } from '@/types'
import {
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  Grid3X3,
  Layers,
  MapPin,
  Maximize2,
  RotateCcw,
  Search,
  ZoomIn,
  Loader2,
  X,
} from 'lucide-react'

export default function ReviewPanel() {
  const {
    snapshots,
    activeSnapshotId,
    setActiveSnapshot,
    restoreFilterFromSnapshot,
    filterRestoredFrom,
    cadLayers,
    createNewSnapshot,
    locateObject,
    locatedObjectId,
  } = useAppStore()
  const toast = useToast()
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null)
  const [restoredId, setRestoredId] = useState<string | null>(null)
  const [showNewSnapshotModal, setShowNewSnapshotModal] = useState(false)
  const [newSnapshotName, setNewSnapshotName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isLocating, setIsLocating] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const activeSnapshot: ReviewSnapshot | undefined =
    snapshots.find((s) => s.id === (activeSnapshotId ?? snapshots[0]?.id)) ?? snapshots[0]

  if (!activeSnapshot) return null

  const handleRestore = (snapId: string) => {
    restoreFilterFromSnapshot(snapId)
    setRestoredId(snapId)
    setTimeout(() => setRestoredId(null), 2000)
    toast.success('筛选条件已还原至评审时状态')
  }

  const handleCreateSnapshot = async () => {
    if (!newSnapshotName.trim()) {
      toast.warning('请输入快照名称')
      nameInputRef.current?.focus()
      return
    }
    setIsCreating(true)
    toast.info('正在创建评审快照...')
    try {
      const snap = await createNewSnapshot(newSnapshotName.trim())
      setActiveSnapshot(snap.id)
      setNewSnapshotName('')
      setShowNewSnapshotModal(false)
      toast.success(`已创建快照「${snap.name}」，当前筛选条件已保存。`, 4000)
    } catch {
      toast.error('创建快照失败，请重试。')
    } finally {
      setIsCreating(false)
    }
  }

  const handleLocateObject = async (objectId: string, label: string) => {
    setIsLocating(objectId)
    toast.info(`正在定位对象「${label}」...`)
    try {
      await locateObject(objectId)
      toast.success(`已定位到「${label}」，对应图层和坐标已高亮显示。`, 3500)
    } catch {
      toast.error('定位失败，对象可能已被删除。')
    } finally {
      setTimeout(() => setIsLocating(null), 500)
    }
  }

  return (
    <div className="p-6 space-y-6 min-w-[1200px]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-engineer-800">评审回溯</h1>
          <p className="text-sm text-engineer-500 mt-1">
            从评审截图回到对象来源和当前筛选，讨论时随时追溯
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowNewSnapshotModal(true)
              setTimeout(() => nameInputRef.current?.focus(), 100)
            }}
            className="btn-eng btn-ghost"
          >
            <Camera className="w-4 h-4 mr-1.5 inline" />
            新建评审快照
          </button>
        </div>
        {locatedObjectId && (
          <span className="tag tag-success ml-2">
            <MapPin className="w-3 h-3 mr-1" />
            已定位对象：{locatedObjectId}
          </span>
        )}
      </header>

      <div className="grid grid-cols-12 gap-5">
        {/* 左侧截图列表 */}
        <aside className="col-span-3 space-y-3">
          <div className="text-xs font-medium text-engineer-600 px-1">评审快照列表</div>
          {snapshots.map((snap) => {
            const isActive = (activeSnapshotId ?? snapshots[0].id) === snap.id
            return (
              <button
                key={snap.id}
                onClick={() => setActiveSnapshot(snap.id)}
                className={`w-full text-left rounded border overflow-hidden card-shadow-hover transition-all ${
                  isActive ? 'border-engineer-600 ring-2 ring-engineer-600/20' : 'border-engineer-200 bg-white hover:border-engineer-400'
                }`}
              >
                <div className="aspect-video bg-engineer-100 relative">
                  <img
                    src={snap.screenshotUrl}
                    alt={snap.name}
                    className="w-full h-full object-cover"
                  />
                  {isActive && (
                    <div className="absolute inset-0 border-2 border-engineer-600 rounded pointer-events-none" />
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="tag" style={{ background: 'rgba(30,58,95,0.85)', color: '#fff', border: 'none' }}>
                      <Eye className="w-3 h-3 mr-1" />
                      {snap.hotspots.length} 热点
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium text-engineer-800 line-clamp-1">{snap.name}</div>
                  <div className="text-[11px] font-mono text-engineer-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {snap.createdAt}
                  </div>
                </div>
              </button>
            )
          })}
        </aside>

        {/* 中间截图视图 */}
        <section className="col-span-6">
          <div className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden h-full flex flex-col">
            <div className="px-5 py-3 border-b border-engineer-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-engineer-500" />
                <span className="text-sm font-medium text-engineer-800">{activeSnapshot.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-eng btn-ghost text-xs py-1 px-2.5">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button className="btn-eng btn-ghost text-xs py-1 px-2.5">
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-engineer-50 p-4">
              <div className="relative rounded overflow-hidden border border-engineer-200 shadow-inner">
                <img
                  src={activeSnapshot.screenshotUrl}
                  alt={activeSnapshot.name}
                  className="w-full h-auto block"
                />
                {/* 热点标注 */}
                {activeSnapshot.hotspots.map((hs: Hotspot) => {
                  const isHover = hoveredHotspot === hs.id
                  return (
                    <button
                      key={hs.id}
                      onMouseEnter={() => setHoveredHotspot(hs.id)}
                      onMouseLeave={() => setHoveredHotspot(null)}
                      style={{
                        left: `${hs.x}%`,
                        top: `${hs.y}%`,
                        width: `${hs.width}%`,
                        height: `${hs.height}%`,
                      }}
                      className={`absolute border-2 rounded transition-all ${
                        isHover
                          ? 'bg-engineer-600/30 border-engineer-600'
                          : 'bg-engineer-500/15 border-engineer-500/70 hover:bg-engineer-500/25'
                      }`}
                    >
                      <span className={`absolute -top-6 left-0 text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap transition-opacity ${
                        isHover ? 'opacity-100' : 'opacity-0'
                      }`}
                        style={{ background: '#1e3a5f', color: '#fff' }}
                      >
                        {hs.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {hoveredHotspot && (
                <div className="absolute bottom-6 left-6 right-6 bg-white rounded border border-engineer-300 p-3 card-shadow">
                  {(() => {
                    const hs = activeSnapshot.hotspots.find((h) => h.id === hoveredHotspot)
                    if (!hs) return null
                    const obj = cadLayers.flatMap((l) => l.objects).find((o) => o.id === hs.targetObjectId)
                    const layer = obj ? cadLayers.find((l) => l.id === obj.layerId) : null
                    return (
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded bg-engineer-700 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-engineer-800">{hs.label}</div>
                          {obj && layer && (
                            <div className="text-[11px] text-engineer-500 mt-1 space-y-0.5">
                              <div>来源图层：<span className="font-mono">{layer.name}</span></div>
                              <div>对象坐标：<span className="font-mono">({obj.x}, {obj.y})</span> · 尺寸 {obj.width}×{obj.height}</div>
                              <div>对象类型：<span className="font-mono">{obj.type}</span></div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => obj && handleLocateObject(obj.id, hs.label)}
                          disabled={isLocating === obj?.id}
                          className="btn-eng btn-primary text-xs py-1.5 px-3 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isLocating === obj?.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />
                              定位中...
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 mr-1 inline" />
                              定位到对象
                            </>
                          )}
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 右侧筛选快照 */}
        <aside className="col-span-3 space-y-4">
          {/* 筛选条件快照 */}
          <div className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-engineer-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-engineer-600" />
                <span className="text-sm font-medium text-engineer-800">筛选条件快照</span>
              </div>
              <button
                onClick={() => handleRestore(activeSnapshot.id)}
                className={`btn-eng text-xs py-1 px-3 transition-all ${
                  restoredId === activeSnapshot.id ? 'btn-success' : 'btn-primary'
                }`}
              >
                {restoredId === activeSnapshot.id ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                    已还原
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3 h-3 mr-1 inline" />
                    一键还原
                  </>
                )}
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div>
                <div className="text-[11px] text-engineer-500 mb-2">可见图层</div>
                <div className="flex flex-wrap gap-1.5">
                  {activeSnapshot.filterCondition.visibleLayers.map((lid) => {
                    const layer = cadLayers.find((l) => l.id === lid)
                    return (
                      <span key={lid} className="tag tag-info">
                        <Layers className="w-3 h-3 mr-1" />
                        {layer?.name.split('_')[0] ?? lid}
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-engineer-500 mb-1">坐标系</div>
                  <div className="flex items-center gap-1.5 text-engineer-800">
                    <MapPin className="w-3.5 h-3.5 text-engineer-400" />
                    <span className="font-mono">{activeSnapshot.filterCondition.coordinateSystem}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-engineer-500 mb-1">缩放级别</div>
                  <div className="flex items-center gap-1.5 text-engineer-800">
                    <ZoomIn className="w-3.5 h-3.5 text-engineer-400" />
                    <span className="font-mono">×{activeSnapshot.filterCondition.zoomLevel}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-engineer-500 mb-1">显示网格</div>
                <div className="flex items-center gap-1.5 text-engineer-800">
                  <Grid3X3 className="w-3.5 h-3.5 text-engineer-400" />
                  <span>{activeSnapshot.filterCondition.showGrid ? '已开启' : '已关闭'}</span>
                </div>
              </div>

              {filterRestoredFrom === activeSnapshot.id && restoredId !== activeSnapshot.id && (
                <div className="mt-2 p-2 bg-emerald-50 rounded border border-success-500/30 text-xs text-success-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  筛选条件已还原至评审时状态
                </div>
              )}
            </div>
          </div>

          {/* 热点列表 */}
          <div className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-engineer-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-engineer-600" />
              <span className="text-sm font-medium text-engineer-800">热点对象</span>
            </div>
            <div className="divide-y divide-engineer-100">
              {activeSnapshot.hotspots.map((hs) => (
                <button
                  key={hs.id}
                  onMouseEnter={() => setHoveredHotspot(hs.id)}
                  onMouseLeave={() => setHoveredHotspot(null)}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                    hoveredHotspot === hs.id ? 'bg-engineer-50' : 'hover:bg-engineer-50/50'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    hoveredHotspot === hs.id ? 'bg-engineer-600' : 'bg-engineer-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-engineer-800">{hs.label}</div>
                    <div className="text-[11px] font-mono text-engineer-500 mt-0.5">
                      对象ID: {hs.targetObjectId}
                    </div>
                  </div>
                  <Eye className="w-3.5 h-3.5 text-engineer-400" />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* 新建快照 Modal */}
      {showNewSnapshotModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-engineer-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg border border-engineer-200 card-shadow w-[440px] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
            `}</style>
            <div className="px-5 py-3.5 border-b border-engineer-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-engineer-600" />
                <span className="text-sm font-semibold text-engineer-800">新建评审快照</span>
              </div>
              <button
                onClick={() => setShowNewSnapshotModal(false)}
                className="text-engineer-400 hover:text-engineer-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-engineer-700 mb-2">快照名称</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={newSnapshotName}
                  onChange={(e) => setNewSnapshotName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
                  placeholder="如：6月11日评审会-动线方案复核"
                  className="w-full px-3 py-2 text-sm border border-engineer-200 rounded bg-white text-engineer-800 placeholder:text-engineer-400 focus:outline-none focus:border-engineer-500 focus:ring-1 focus:ring-engineer-500/30"
                />
              </div>
              <div className="p-3 bg-engineer-50 rounded border border-engineer-100 text-xs text-engineer-600 leading-relaxed">
                <div className="font-medium text-engineer-700 mb-1">当前状态将被保存：</div>
                <div className="space-y-0.5 font-mono">
                  <div>• 可见图层：{cadLayers.length} 个</div>
                  <div>• 坐标系：BJ-54</div>
                  <div>• 缩放：×1.0</div>
                  <div>• 网格显示：开启</div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-engineer-100 bg-engineer-50/40 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNewSnapshotModal(false)}
                className="btn-eng btn-ghost text-xs py-1.5 px-3"
              >
                取消
              </button>
              <button
                onClick={handleCreateSnapshot}
                disabled={isCreating}
                className="btn-eng btn-primary text-xs py-1.5 px-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 inline animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 mr-1.5 inline" />
                    创建快照
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
