import { useStore, getSelectedRecordLights } from '@/store/useStore'
import { exportCsv } from '@/utils/csvExport'
import type { LightPoint } from '@/types'

function typeLabel(t: string): string {
  const map: Record<string, string> = { top: '顶部', side: '侧面', bottom: '底部', accent: '重点' }
  return map[t] ?? t
}

export default function CsvPanel() {
  const open = useStore(s => s.csvPanelOpen)
  const toggle = useStore(s => s.toggleCsvPanel)
  const selectedLightId = useStore(s => s.selectedLightId)
  const selectLight = useStore(s => s.selectLight)
  const store = useStore()
  const lights = getSelectedRecordLights(store)
  const record = useStore(s => {
    const recs = s.filteredRecords
    return recs.find(r => r.id === s.selectedRecordId)
  })

  if (!record) return null

  return (
    <div className="border-t border-[#2a2a3e] bg-[#0f0f1c]">
      <button
        onClick={toggle}
        className="w-full px-4 py-2 flex items-center justify-between text-xs text-[#8a8aae] hover:text-[#c8c8d8] transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1" y="1" width="10" height="10" rx="1" />
            <line x1="4" y1="1" x2="4" y2="11" />
            <line x1="8" y1="1" x2="8" y2="11" />
            <line x1="1" y1="4" x2="11" y2="4" />
            <line x1="1" y1="8" x2="11" y2="8" />
          </svg>
          CSV明细 ({lights.length} 条)
        </span>
        <svg
          width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.2"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="1,1 5,5 9,1" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="overflow-x-auto rounded border border-[#2a2a3e]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1a1a2e]">
                  <Th>编号</Th>
                  <Th>标签</Th>
                  <Th>类型</Th>
                  <Th>色温(K)</Th>
                  <Th>照度(lux)</Th>
                  <Th>异常</Th>
                  <Th>说明</Th>
                </tr>
              </thead>
              <tbody>
                {lights.map(l => (
                  <tr
                    key={l.id}
                    onClick={() => selectLight(l.id)}
                    className={`border-t border-[#1a1a2e] cursor-pointer transition-colors ${
                      selectedLightId === l.id ? 'bg-[#d4a85315]' : 'hover:bg-[#12121f]'
                    } ${l.isAnomaly ? 'border-l-2 border-l-[#e74c3c]' : ''}`}
                  >
                    <Td>{l.id}</Td>
                    <Td>{l.label}</Td>
                    <Td>{typeLabel(l.type)}</Td>
                    <Td>{l.colorTemp}</Td>
                    <Td>{l.illuminance}</Td>
                    <Td>
                      {l.isAnomaly ? (
                        <span className="text-[#e74c3c]">是</span>
                      ) : (
                        <span className="text-[#5a5a7e]">否</span>
                      )}
                    </Td>
                    <Td className="max-w-40 truncate">{l.anomalyNote ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex justify-end">
            <button
              onClick={() => exportCsv(lights, `${record.displayCaseId}-灯光明细`)}
              className="px-3 py-1.5 text-xs rounded bg-[#d4a85320] text-[#d4a853] hover:bg-[#d4a85330] transition-colors"
            >
              导出CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2 py-1.5 text-left text-[#6a6a8e] font-medium whitespace-nowrap">{children}</th>
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1.5 text-[#a0a0be] whitespace-nowrap ${className ?? ''}`}>{children}</td>
}
