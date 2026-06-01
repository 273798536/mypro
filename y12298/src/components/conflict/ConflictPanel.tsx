import { useAppStore } from '@/store/useAppStore'
import type { ConflictType, ConflictStatus } from '@/types'
import { AlertTriangle, ShieldAlert, Hash } from 'lucide-react'

const typeLabelMap: Record<ConflictType, string> = {
  valve_duplicate: '重号',
  route_forbidden: '禁区',
  model_mismatch: '不一致',
}

const statusColorMap: Record<ConflictStatus, string> = {
  open: '#DC2626',
  investigating: '#D97706',
  resolved: '#059669',
  accepted: '#1E40AF',
}

export default function ConflictPanel() {
  const conflicts = useAppStore((s) => s.conflicts)
  const selectedConflictId = useAppStore((s) => s.selectedConflictId)
  const setSelectedConflict = useAppStore((s) => s.setSelectedConflict)
  const setSelectedRoute = useAppStore((s) => s.setSelectedRoute)
  const setSelectedValve = useAppStore((s) => s.setSelectedValve)
  const setSelectedWorkOrder = useAppStore((s) => s.setSelectedWorkOrder)

  const valveDuplicateCount = conflicts.filter((c) => c.type === 'valve_duplicate').length
  const routeForbiddenCount = conflicts.filter((c) => c.type === 'route_forbidden').length
  const modelMismatchCount = conflicts.filter((c) => c.type === 'model_mismatch').length

  const selectedConflict = conflicts.find((c) => c.id === selectedConflictId)

  const handleSelectConflict = (conflict: typeof conflicts[number]) => {
    setSelectedConflict(conflict.id)
    if (conflict.relatedRouteIds?.length) setSelectedRoute(conflict.relatedRouteIds[0])
    if (conflict.relatedValveIds?.length) setSelectedValve(conflict.relatedValveIds[0])
  }

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: 'Noto Sans SC, sans-serif' }}>
      <div className="grid grid-cols-3 gap-2 p-3">
        <div className="flex flex-col items-center rounded border p-2" style={{ background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.3)' }}>
          <AlertTriangle size={12} style={{ color: '#DC2626' }} />
          <span className="mt-1 text-lg font-bold" style={{ color: '#DC2626', fontFamily: 'JetBrains Mono, monospace' }}>{valveDuplicateCount}</span>
          <span className="text-[10px]" style={{ color: '#94A3B8' }}>阀门重号</span>
        </div>
        <div className="flex flex-col items-center rounded border p-2" style={{ background: 'rgba(217,119,6,0.08)', borderColor: 'rgba(217,119,6,0.3)' }}>
          <ShieldAlert size={12} style={{ color: '#D97706' }} />
          <span className="mt-1 text-lg font-bold" style={{ color: '#D97706', fontFamily: 'JetBrains Mono, monospace' }}>{routeForbiddenCount}</span>
          <span className="text-[10px]" style={{ color: '#94A3B8' }}>穿禁区</span>
        </div>
        <div className="flex flex-col items-center rounded border p-2" style={{ background: 'rgba(30,64,175,0.08)', borderColor: 'rgba(30,64,175,0.3)' }}>
          <Hash size={12} style={{ color: '#60A5FA' }} />
          <span className="mt-1 text-lg font-bold" style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}>{modelMismatchCount}</span>
          <span className="text-[10px]" style={{ color: '#94A3B8' }}>编号不一致</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E3A5F transparent' }}>
        {conflicts.length === 0 && (
          <div className="py-8 text-center text-xs" style={{ color: '#475569' }}>暂无冲突数据</div>
        )}
        <div className="flex flex-col gap-1.5">
          {conflicts.map((c) => (
            <div
              key={c.id}
              onClick={() => handleSelectConflict(c)}
              className="flex cursor-pointer items-start gap-2 rounded border px-2 py-1.5 transition-colors"
              style={{
                background: selectedConflictId === c.id ? '#1E293B' : 'rgba(30,64,175,0.04)',
                borderColor: selectedConflictId === c.id ? '#1E40AF' : '#1E3A5F',
              }}
            >
              <div
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: statusColorMap[c.status] }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium" style={{ color: '#CBD5E1' }}>{c.title}</span>
                  <span
                    className="shrink-0 rounded px-1 py-px text-[10px]"
                    style={{ background: 'rgba(30,64,175,0.15)', color: '#60A5FA' }}
                  >
                    {typeLabelMap[c.type]}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px]" style={{ color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                  {c.workOrderId && <span>WO:{c.workOrderId}</span>}
                  <span>{c.detectedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedConflict && (
        <div className="border-t p-3" style={{ borderColor: '#1E3A5F', background: 'rgba(15,29,47,0.8)' }}>
          <div className="text-xs font-medium" style={{ color: '#60A5FA' }}>{selectedConflict.title}</div>
          <div className="mt-1 text-xs" style={{ color: '#94A3B8' }}>{selectedConflict.description}</div>
          {selectedConflict.workOrderId && (
            <button
              onClick={() => setSelectedWorkOrder(selectedConflict.workOrderId!)}
              className="mt-1.5 text-[10px] underline"
              style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}
            >
              关联工单: {selectedConflict.workOrderId}
            </button>
          )}
          {selectedConflict.evidence.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px]" style={{ color: '#64748B' }}>证据链</div>
              {selectedConflict.evidence.map((e) => (
                <div key={e.id} className="mt-1 flex items-start gap-1 text-[10px]" style={{ color: '#94A3B8' }}>
                  <span style={{ color: '#475569' }}>●</span>
                  <div>
                    <div>{e.description}</div>
                    <div style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{e.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
