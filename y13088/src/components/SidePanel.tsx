import { useStore, getSelectedLight, getSelectedRecordLights } from '@/store/useStore'

function typeLabel(t: string): string {
  const map: Record<string, string> = { top: '顶部', side: '侧面', bottom: '底部', accent: '重点' }
  return map[t] ?? t
}

export default function SidePanel() {
  const store = useStore()
  const selectedLight = getSelectedLight(store)
  const lights = getSelectedRecordLights(store)
  const selectedRecordId = useStore(s => s.selectedRecordId)
  const selectLight = useStore(s => s.selectLight)
  const filteredRecords = useStore(s => s.filteredRecords)
  const record = filteredRecords.find(r => r.id === selectedRecordId)

  if (!record) {
    return (
      <div className="w-72 min-w-72 border-l border-[#2a2a3e] bg-[#12121f] p-4 flex flex-col items-center justify-center text-[#5a5a7e] text-sm">
        <p>请在巡检记录中选择一条记录</p>
        <p className="text-xs mt-1">或点击「加载样例」</p>
      </div>
    )
  }

  return (
    <div className="w-72 min-w-72 border-l border-[#2a2a3e] bg-[#12121f] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a3e]">
        <h3 className="text-sm font-semibold text-[#d4a853]">{record.displayCaseId}</h3>
        <p className="text-xs text-[#8a8aae] mt-0.5">{record.floor} {record.unit} · {record.timestamp.slice(0, 10)}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {selectedLight ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedLight.isAnomaly ? '#e74c3c' : '#d4a853' }} />
              <span className="text-sm font-medium text-[#e8e8f0]">{selectedLight.label}</span>
            </div>

            <div className="space-y-2 text-xs">
              <InfoRow label="编号" value={selectedLight.id} />
              <InfoRow label="类型" value={typeLabel(selectedLight.type)} />
              <InfoRow label="色温" value={`${selectedLight.colorTemp}K`} />
              <InfoRow label="照度" value={`${selectedLight.illuminance} lux`} />
              <InfoRow label="异常" value={selectedLight.isAnomaly ? '是' : '否'} highlight={selectedLight.isAnomaly} />
              {selectedLight.anomalyNote && (
                <div className="mt-2 p-2 rounded bg-[#2a1520] border border-[#5a2030] text-[#e74c3c] text-xs leading-relaxed">
                  {selectedLight.anomalyNote}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#5a5a7e]">点击剖面图上的灯光标注查看详情</p>
        )}
      </div>

      <div className="border-t border-[#2a2a3e] px-4 py-3">
        <p className="text-[10px] text-[#5a5a7e] mb-2">灯光列表 ({lights.length})</p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {lights.map(l => (
            <button
              key={l.id}
              onClick={() => selectLight(l.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                selectedLight?.id === l.id
                  ? 'bg-[#d4a85320] text-[#d4a853]'
                  : 'text-[#8a8aae] hover:bg-[#1a1a2e]'
              }`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: l.isAnomaly ? '#e74c3c' : '#d4a853' }} />
              {l.label}
              {l.isAnomaly && <span className="ml-1 text-[#e74c3c]">⚠</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[#6a6a8e]">{label}</span>
      <span className={highlight ? 'text-[#e74c3c] font-medium' : 'text-[#c8c8d8]'}>{value}</span>
    </div>
  )
}
