import { useAppStore } from '@/store/useAppStore'
import type { ValveStatus, ValveType } from '@/types'
import { AlertTriangle, Wrench, Copy } from 'lucide-react'

const statusColorMap: Record<ValveStatus, string> = {
  normal: '#059669',
  duplicate: '#DC2626',
  mismatch: '#D97706',
  maintenance: '#64748B',
}

const statusLabelMap: Record<ValveStatus, string> = {
  normal: '正常',
  duplicate: '重号',
  mismatch: '不一致',
  maintenance: '维护中',
}

const typeLabelMap: Record<ValveType, string> = {
  gate: '闸阀',
  ball: '球阀',
  butterfly: '蝶阀',
  check: '止回阀',
}

export default function ValvePanel() {
  const valves = useAppStore((s) => s.valves)
  const selectedValveId = useAppStore((s) => s.selectedValveId)
  const setSelectedValve = useAppStore((s) => s.setSelectedValve)
  const workOrders = useAppStore((s) => s.workOrders)

  const selectedValve = valves.find((v) => v.id === selectedValveId)

  const selectedValveWorkOrders = selectedValve
    ? workOrders.filter((w) => selectedValve.workOrderIds.includes(w.id))
    : []

  const duplicateValves = selectedValve?.status === 'duplicate'
    ? valves.filter((v) => v.tagNumber === selectedValve.tagNumber && v.id !== selectedValve.id)
    : []

  const isModelMismatch = (v: typeof valves[number]) => v.modelRemark !== v.tagNumber

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: 'Noto Sans SC, sans-serif' }}>
      <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E3A5F transparent' }}>
        {valves.length === 0 && (
          <div className="py-8 text-center text-xs" style={{ color: '#475569' }}>暂无阀门数据</div>
        )}
        <div className="flex flex-col gap-1.5">
          {valves.map((v) => {
            const isSelected = selectedValveId === v.id
            return (
              <div
                key={v.id}
                onClick={() => setSelectedValve(v.id)}
                className="cursor-pointer rounded border px-2 py-1.5 transition-colors"
                style={{
                  background: isSelected ? '#1E293B' : 'rgba(30,64,175,0.04)',
                  borderColor: isSelected ? '#1E40AF' : '#1E3A5F',
                  borderLeftWidth: v.status === 'duplicate' ? 3 : 1,
                  borderLeftColor: v.status === 'duplicate' ? '#DC2626' : isSelected ? '#1E40AF' : '#1E3A5F',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: '#CBD5E1',
                      fontFamily: 'JetBrains Mono, monospace',
                      animation: v.status === 'duplicate' ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : undefined,
                    }}
                  >
                    {v.tagNumber}
                  </span>
                  <span className="text-[10px]" style={{ color: '#64748B' }}>{typeLabelMap[v.type]}</span>
                  <span
                    className="shrink-0 rounded px-1 py-px text-[10px]"
                    style={{ background: `${statusColorMap[v.status]}18`, color: statusColorMap[v.status] }}
                  >
                    {statusLabelMap[v.status]}
                  </span>
                </div>
                {isModelMismatch(v) && (
                  <div className="mt-0.5 text-[10px]" style={{ color: '#D97706' }}>
                    模型:{v.modelRemark} ≠ 实际:{v.tagNumber}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedValve && (
        <div className="border-t p-3" style={{ borderColor: '#1E3A5F', background: 'rgba(15,29,47,0.8)' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}>{selectedValve.tagNumber}</span>
            <span className="rounded px-1 py-px text-[10px]" style={{ background: `${statusColorMap[selectedValve.status]}18`, color: statusColorMap[selectedValve.status] }}>
              {statusLabelMap[selectedValve.status]}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <div>
              <span style={{ color: '#64748B' }}>编号</span>
              <div style={{ color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>{selectedValve.tagNumber}</div>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>类型</span>
              <div style={{ color: '#94A3B8' }}>{typeLabelMap[selectedValve.type]}</div>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>最后巡检</span>
              <div style={{ color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>{selectedValve.lastInspectionDate || '—'}</div>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-[10px]" style={{ color: '#64748B' }}>模型备注对比</div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px]">
              <span style={{ color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>{selectedValve.modelRemark}</span>
              {isModelMismatch(selectedValve) ? (
                <>
                  <span style={{ color: '#DC2626' }}>≠</span>
                  <span style={{ color: '#DC2626', fontFamily: 'JetBrains Mono, monospace' }}>{selectedValve.tagNumber}</span>
                  <AlertTriangle size={10} style={{ color: '#DC2626' }} />
                </>
              ) : (
                <span style={{ color: '#059669' }}>✓ 一致</span>
              )}
            </div>
          </div>

          {selectedValveWorkOrders.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px]" style={{ color: '#64748B' }}>关联工单</div>
              {selectedValveWorkOrders.map((wo) => (
                <div key={wo.id} className="mt-0.5 flex items-center gap-1 text-[10px]">
                  <Wrench size={9} style={{ color: '#60A5FA' }} />
                  <span style={{ color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>{wo.id}</span>
                  <span className="truncate" style={{ color: '#94A3B8' }}>{wo.title}</span>
                </div>
              ))}
            </div>
          )}

          {duplicateValves.length > 0 && (
            <div className="mt-2 rounded px-2 py-1.5" style={{ background: 'rgba(220,38,38,0.08)', borderLeft: '3px solid #DC2626' }}>
              <div className="flex items-center gap-1 text-[10px] font-medium" style={{ color: '#DC2626' }}>
                <Copy size={10} />
                重号阀门 ({duplicateValves.length})
              </div>
              {duplicateValves.map((dv) => (
                <div key={dv.id} className="mt-1 text-[10px]" style={{ color: '#FCA5A5' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{dv.tagNumber}</span>
                  <span style={{ color: '#94A3B8' }}> · {typeLabelMap[dv.type]}</span>
                  <span style={{ color: '#64748B' }}> · ID:{dv.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
