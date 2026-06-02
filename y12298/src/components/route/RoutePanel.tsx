import { useAppStore } from '@/store/useAppStore'
import type { RouteStatus } from '@/types'
import {
  GitCompare,
  AlertOctagon,
  MapPin,
  Clock,
  FileText,
  RotateCcw,
  Trash2,
  X,
  Plus,
  Save,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { useState } from 'react'

const statusColorMap: Record<RouteStatus, string> = {
  active: '#059669',
  deprecated: '#64748B',
  failed: '#DC2626',
  draft: '#1E40AF',
}

const statusLabelMap: Record<RouteStatus, string> = {
  active: '启用',
  deprecated: '已废弃',
  failed: '失败',
  draft: '草稿',
}

export default function RoutePanel() {
  const routes = useAppStore((s) => s.routes)
  const selectedRouteId = useAppStore((s) => s.selectedRouteId)
  const setSelectedRoute = useAppStore((s) => s.setSelectedRoute)
  const workOrders = useAppStore((s) => s.workOrders)
  const compareMode = useAppStore((s) => s.compareMode)
  const compareRouteId1 = useAppStore((s) => s.compareRouteId1)
  const compareRouteId2 = useAppStore((s) => s.compareRouteId2)
  const startCompare = useAppStore((s) => s.startCompare)
  const selectCompareRoute = useAppStore((s) => s.selectCompareRoute)
  const cancelCompare = useAppStore((s) => s.cancelCompare)
  const rollbackRoute = useAppStore((s) => s.rollbackRoute)
  const deleteRoute = useAppStore((s) => s.deleteRoute)
  const isDrawingRoute = useAppStore((s) => s.isDrawingRoute)
  const startDrawingRoute = useAppStore((s) => s.startDrawingRoute)
  const cancelDrawingRoute = useAppStore((s) => s.cancelDrawingRoute)

  const [rollbackResult, setRollbackResult] = useState<string | null>(null)
  const [deleteResult, setDeleteResult] = useState<string | null>(null)

  const selectedRoute = routes.find((r) => r.id === selectedRouteId)
  const compareRoute1 = routes.find((r) => r.id === compareRouteId1)
  const compareRoute2 = routes.find((r) => r.id === compareRouteId2)

  const selectedWorkOrder = selectedRoute?.workOrderId
    ? workOrders.find((w) => w.id === selectedRoute.workOrderId)
    : null

  const handleClick = (routeId: string) => {
    if (compareMode === 'selecting') {
      selectCompareRoute(routeId)
    } else {
      setSelectedRoute(routeId)
    }
  }

  const handleRollback = (routeId: string) => {
    const success = rollbackRoute(routeId)
    setRollbackResult(success ? '回滚成功，该版本已设为启用' : '回滚失败，只能回滚非启用版本')
    setTimeout(() => setRollbackResult(null), 2000)
  }

  const handleDelete = (routeId: string) => {
    const success = deleteRoute(routeId)
    setDeleteResult(success ? '删除成功' : '删除失败，启用版本不能删除')
    setTimeout(() => setDeleteResult(null), 2000)
  }

  const getRouteDiff = () => {
    if (!compareRoute1 || !compareRoute2) return null
    const nodes1 = compareRoute1.points.map((p) => p.nodeId)
    const nodes2 = compareRoute2.points.map((p) => p.nodeId)
    const added = nodes2.filter((n) => !nodes1.includes(n))
    const removed = nodes1.filter((n) => !nodes2.includes(n))
    return { added, removed }
  }

  const diff = compareMode === 'comparing' ? getRouteDiff() : null

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: 'Noto Sans SC, sans-serif' }}>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: '#1E3A5F' }}>
        <div className="text-xs font-medium" style={{ color: '#94A3B8' }}>路线版本</div>
        {!isDrawingRoute && (
          <button
            onClick={startDrawingRoute}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60A5FA' }}
          >
            <Plus size={12} />
            新建路线
          </button>
        )}
      </div>

      {compareMode !== 'none' && (
        <div className="border-b px-3 py-2" style={{ borderColor: '#1E3A5F', background: 'rgba(30,64,175,0.08)' }}>
          <div className="flex items-center justify-between">
            <div className="text-xs" style={{ color: '#94A3B8' }}>
              {compareMode === 'selecting'
                ? `请选择第 ${compareRouteId1 ? '2' : '1'} 个对比版本`
                : '版本对比中'}
            </div>
            <button onClick={cancelCompare} className="rounded p-1 hover:bg-white/5" style={{ color: '#64748B' }}>
              <X size={14} />
            </button>
          </div>
          {compareRouteId1 && (
            <div className="mt-1 text-[10px]" style={{ color: '#60A5FA' }}>
              已选: {compareRoute1?.version} · {compareRoute1?.name}
            </div>
          )}
        </div>
      )}

      {isDrawingRoute && (
        <div className="border-b p-3" style={{ borderColor: '#1E3A5F', background: 'rgba(59, 130, 246, 0.06)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#60A5FA' }}>
              <MapPin size={12} />
              绘制模式
            </div>
            <button
              onClick={cancelDrawingRoute}
              className="rounded p-1 hover:bg-white/10"
              style={{ color: '#F87171' }}
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-2 text-[10px]" style={{ color: '#94A3B8' }}>
            点击3D场景中的管廊节点添加路线点
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E3A5F transparent' }}>
        {routes.length === 0 && (
          <div className="py-8 text-center text-xs" style={{ color: '#475569' }}>暂无路线数据</div>
        )}
        <div className="flex flex-col gap-1.5">
          {routes.map((r) => {
            const isSelected = selectedRouteId === r.id
            const isCompare1 = compareRouteId1 === r.id
            const isCompare2 = compareRouteId2 === r.id
            return (
              <div
                key={r.id}
                onClick={() => handleClick(r.id)}
                className="cursor-pointer rounded border px-2 py-1.5 transition-colors"
                style={{
                  background: isCompare1 || isCompare2 ? 'rgba(34,197,94,0.08)' : isSelected ? '#1E293B' : 'rgba(30,64,175,0.04)',
                  borderColor: isCompare1 || isCompare2 ? '#22C55E' : isSelected ? '#1E40AF' : '#1E3A5F',
                  borderLeftWidth: r.status === 'failed' ? 3 : 1,
                  borderLeftColor: r.status === 'failed' ? '#DC2626' : isCompare1 || isCompare2 ? '#22C55E' : isSelected ? '#1E40AF' : '#1E3A5F',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium" style={{ color: '#CBD5E1', fontFamily: 'JetBrains Mono, monospace' }}>v{r.version}</span>
                  <span className="min-w-0 flex-1 truncate text-xs" style={{ color: '#CBD5E1' }}>{r.name}</span>
                  <span
                    className="shrink-0 rounded px-1 py-px text-[10px]"
                    style={{ background: `${statusColorMap[r.status]}18`, color: statusColorMap[r.status] }}
                  >
                    {statusLabelMap[r.status]}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px]" style={{ color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                  <span>{r.createdAt?.slice(0, 10)}</span>
                  {r.workOrderId && <span>WO:{r.workOrderId}</span>}
                </div>
                {r.status === 'failed' && r.failedReason && (
                  <div className="mt-1 flex items-start gap-1 text-[10px]" style={{ color: '#DC2626' }}>
                    <AlertOctagon size={10} className="mt-0.5 shrink-0" />
                    <span>{r.failedReason}</span>
                  </div>
                )}
                {(isCompare1 || isCompare2) && (
                  <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: '#22C55E' }}>
                    <Check size={10} />
                    <span>对比项 {isCompare1 ? 'A' : 'B'}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {compareMode === 'comparing' && diff && (
        <div className="border-t p-3" style={{ borderColor: '#1E3A5F', background: 'rgba(34,197,94,0.04)' }}>
          <div className="text-xs font-medium" style={{ color: '#22C55E' }}>版本差异</div>
          <div className="mt-2 space-y-1">
            {diff.added.length > 0 && (
              <div className="text-[10px]" style={{ color: '#22C55E' }}>
                + 新增节点: {diff.added.join(', ')}
              </div>
            )}
            {diff.removed.length > 0 && (
              <div className="text-[10px]" style={{ color: '#F87171' }}>
                - 移除节点: {diff.removed.join(', ')}
              </div>
            )}
            {diff.added.length === 0 && diff.removed.length === 0 && (
              <div className="text-[10px]" style={{ color: '#64748B' }}>节点完全一致</div>
            )}
          </div>
        </div>
      )}

      {selectedRoute && !isDrawingRoute && compareMode === 'none' && (
        <div className="border-t p-3" style={{ borderColor: '#1E3A5F', background: 'rgba(15,29,47,0.8)' }}>
          <div className="text-xs font-medium" style={{ color: '#60A5FA' }}>
            v{selectedRoute.version} · {selectedRoute.name}
          </div>

          {selectedRoute.status === 'failed' && selectedRoute.failedReason && (
            <div className="mt-2 rounded px-2 py-1.5 text-xs" style={{ background: 'rgba(220,38,38,0.12)', color: '#FCA5A5', borderLeft: '3px solid #DC2626' }}>
              <div className="flex items-center gap-1 font-medium" style={{ color: '#DC2626' }}>
                <AlertOctagon size={12} />
                路线失败
              </div>
              <div className="mt-0.5">{selectedRoute.failedReason}</div>
            </div>
          )}

          <div className="mt-2">
            <div className="flex items-center gap-1 text-[10px]" style={{ color: '#64748B' }}>
              <MapPin size={10} />
              路线点位 ({selectedRoute.points.length})
            </div>
            <div className="mt-1 max-h-32 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E3A5F transparent' }}>
              {selectedRoute.points.map((p, i) => (
                <div key={`${p.nodeId}-${i}`} className="flex items-center gap-2 py-0.5 text-[10px]" style={{ color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                  <span className="w-4 shrink-0 text-right" style={{ color: '#475569' }}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{p.nodeId}</span>
                  {p.arrivalTime && (
                    <span className="flex items-center gap-0.5 shrink-0" style={{ color: '#475569' }}>
                      <Clock size={8} />
                      {p.arrivalTime}
                    </span>
                  )}
                  {p.stayDuration != null && (
                    <span className="shrink-0" style={{ color: '#D97706' }}>{p.stayDuration}min</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedWorkOrder && (
            <div className="mt-2 flex items-start gap-1 text-[10px]" style={{ color: '#94A3B8' }}>
              <FileText size={10} className="mt-0.5 shrink-0" style={{ color: '#60A5FA' }} />
              <div>
                <span style={{ color: '#64748B' }}>关联工单: </span>
                <span style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}>{selectedWorkOrder.id}</span>
                <span> - {selectedWorkOrder.title}</span>
              </div>
            </div>
          )}

          {rollbackResult && (
            <div className={`mt-2 rounded px-2 py-1 text-[10px] ${rollbackResult.includes('成功') ? 'bg-green-950/30 text-green-400' : 'bg-red-950/30 text-red-400'}`}>
              {rollbackResult}
            </div>
          )}

          {deleteResult && (
            <div className={`mt-2 rounded px-2 py-1 text-[10px] ${deleteResult.includes('成功') ? 'bg-green-950/30 text-green-400' : 'bg-red-950/30 text-red-400'}`}>
              {deleteResult}
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleRollback(selectedRoute.id)}
              disabled={selectedRoute.status === 'active'}
              className={`flex flex-col items-center gap-0.5 rounded border p-1.5 text-[10px] transition-colors ${selectedRoute.status === 'active' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'}`}
              style={{ borderColor: '#1E3A5F', color: '#94A3B8' }}
            >
              <RotateCcw size={14} />
              回滚
            </button>
            <button
              onClick={() => handleDelete(selectedRoute.id)}
              disabled={selectedRoute.status === 'active'}
              className={`flex flex-col items-center gap-0.5 rounded border p-1.5 text-[10px] transition-colors ${selectedRoute.status === 'active' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'}`}
              style={{ borderColor: '#1E3A5F', color: '#94A3B8' }}
            >
              <Trash2 size={14} />
              删除
            </button>
            <button
              onClick={startCompare}
              className="flex flex-col items-center gap-0.5 rounded border p-1.5 text-[10px] cursor-pointer hover:bg-white/5 transition-colors"
              style={{ borderColor: '#1E3A5F', color: '#94A3B8' }}
            >
              <GitCompare size={14} />
              对比
            </button>
          </div>
        </div>
      )}

      {isDrawingRoute && <DraftRouteEditor />}
    </div>
  )
}

function DraftRouteEditor() {
  const draftPoints = useAppStore((s) => s.draftRoutePoints)
  const draftName = useAppStore((s) => s.draftRouteName)
  const setDraftName = useAppStore((s) => s.setDraftRouteName)
  const removePoint = useAppStore((s) => s.removeRoutePoint)
  const saveDraftRoute = useAppStore((s) => s.saveDraftRoute)
  const validateDraftRoute = useAppStore((s) => s.validateDraftRoute)

  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)

  const errors = validateDraftRoute()

  const handleSave = () => {
    const result = saveDraftRoute()
    if (result.success) {
      setSaveResult({ success: true, message: `保存成功! ${result.route?.version}` })
    } else {
      setSaveResult({ success: false, message: result.errors.join('; ') })
    }
    setTimeout(() => setSaveResult(null), 3000)
  }

  return (
    <div className="border-t p-3" style={{ borderColor: '#1E3A5F', background: 'rgba(59, 130, 246, 0.04)' }}>
      <div className="mb-2">
        <div className="text-[10px]" style={{ color: '#64748B' }}>路线名称</div>
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-xs"
          style={{ background: '#0F172A', borderColor: '#1E3A5F', color: '#CBD5E1' }}
        />
      </div>

      <div className="mb-2">
        <div className="text-[10px]" style={{ color: '#64748B' }}>
          已选节点 ({draftPoints.length})
        </div>
        <div className="mt-1 max-h-24 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E3A5F transparent' }}>
          {draftPoints.length === 0 ? (
            <div className="text-[10px]" style={{ color: '#475569' }}>点击3D场景中的节点添加</div>
          ) : (
            draftPoints.map((p, i) => (
              <div key={`${p.nodeId}-${i}`} className="flex items-center justify-between py-0.5">
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                  {i + 1}. {p.nodeId}
                </span>
                <button
                  onClick={() => removePoint(i)}
                  className="rounded p-0.5 hover:bg-white/10"
                  style={{ color: '#F87171' }}
                >
                  <X size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-2 space-y-0.5">
          {errors.map((e, i) => (
            <div key={i} className="flex items-start gap-1 text-[10px]" style={{ color: e.startsWith('警告') ? '#F59E0B' : '#F87171' }}>
              {e.startsWith('警告') ? <AlertTriangle size={10} className="mt-0.5 shrink-0" /> : <AlertOctagon size={10} className="mt-0.5 shrink-0" />}
              <span>{e}</span>
            </div>
          ))}
        </div>
      )}

      {saveResult && (
        <div className={`mb-2 rounded px-2 py-1 text-[10px] ${saveResult.success ? 'bg-green-950/30 text-green-400' : 'bg-red-950/30 text-red-400'}`}>
          {saveResult.message}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={draftPoints.length < 2 || errors.some((e) => !e.startsWith('警告'))}
        className={`flex w-full items-center justify-center gap-1 rounded py-1.5 text-xs transition-colors ${draftPoints.length >= 2 && !errors.some((e) => !e.startsWith('警告')) ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
        style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}
      >
        <Save size={12} />
        保存路线
      </button>
    </div>
  )
}
