import { useAppStore } from '@/store/useAppStore'
import type { RouteStatus } from '@/types'
import { GitCompare, AlertOctagon, MapPin, Clock, FileText } from 'lucide-react'

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

  const selectedRoute = routes.find((r) => r.id === selectedRouteId)

  const selectedWorkOrder = selectedRoute?.workOrderId
    ? workOrders.find((w) => w.id === selectedRoute.workOrderId)
    : null

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: 'Noto Sans SC, sans-serif' }}>
      <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E3A5F transparent' }}>
        {routes.length === 0 && (
          <div className="py-8 text-center text-xs" style={{ color: '#475569' }}>暂无路线数据</div>
        )}
        <div className="flex flex-col gap-1.5">
          {routes.map((r) => {
            const isSelected = selectedRouteId === r.id
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRoute(r.id)}
                className="cursor-pointer rounded border px-2 py-1.5 transition-colors"
                style={{
                  background: isSelected ? '#1E293B' : 'rgba(30,64,175,0.04)',
                  borderColor: isSelected ? '#1E40AF' : '#1E3A5F',
                  borderLeftWidth: r.status === 'failed' ? 3 : 1,
                  borderLeftColor: r.status === 'failed' ? '#DC2626' : isSelected ? '#1E40AF' : '#1E3A5F',
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
                  <span>{r.createdAt}</span>
                  {r.workOrderId && <span>WO:{r.workOrderId}</span>}
                </div>
                {r.status === 'failed' && r.failedReason && (
                  <div className="mt-1 flex items-start gap-1 text-[10px]" style={{ color: '#DC2626' }}>
                    <AlertOctagon size={10} className="mt-0.5 shrink-0" />
                    <span>{r.failedReason}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedRoute && (
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

          <button
            disabled
            className="mt-3 flex w-full items-center justify-center gap-1 rounded border px-2 py-1.5 text-xs opacity-50"
            style={{ borderColor: '#1E3A5F', color: '#94A3B8', background: 'rgba(30,64,175,0.04)' }}
            title="即将支持"
          >
            <GitCompare size={12} />
            版本对比
            <span className="text-[10px]" style={{ color: '#475569' }}>（即将支持）</span>
          </button>
        </div>
      )}
    </div>
  )
}
