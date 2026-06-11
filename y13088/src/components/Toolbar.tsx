import React, { useState } from 'react'
import { useStore } from '@/store/useStore'
import { exportCsv } from '@/utils/csvExport'
import { Database, RotateCcw, Download, HelpCircle, Camera } from 'lucide-react'

export default function Toolbar() {
  const loadSample = useStore(s => s.loadSample)
  const rerun = useStore(s => s.rerunAnalysis)
  const toggleHelp = useStore(s => s.toggleHelpCard)
  const saveTrace = useStore(s => s.saveTraceSnapshot)
  const [traceCode, setTraceCode] = useState<string | null>(null)

  const handleExportCsv = () => {
    const store = useStore.getState()
    const rec = store.filteredRecords.find(r => r.id === store.selectedRecordId)
    if (rec) exportCsv(rec.lights, `${rec.displayCaseId}-灯光明细`)
  }

  const handleTrace = () => {
    const snap = saveTrace()
    setTraceCode(snap.id)
    setTimeout(() => setTraceCode(null), 3000)
  }

  return (
    <div className="h-11 min-h-11 border-b border-[#2a2a3e] bg-[#12121f] flex items-center px-4 gap-2">
      <span className="text-sm font-semibold text-[#d4a853] mr-4 tracking-wide">灯光剖面讲解</span>

      <ToolBtn icon={<Database size={14} />} label="加载样例" onClick={loadSample} />
      <ToolBtn icon={<RotateCcw size={14} />} label="重跑" onClick={rerun} />
      <ToolBtn icon={<Download size={14} />} label="导出CSV" onClick={handleExportCsv} />
      <ToolBtn icon={<Camera size={14} />} label="截图追溯" onClick={handleTrace} />

      {traceCode && (
        <span className="ml-2 px-2 py-0.5 rounded bg-[#d4a85320] text-[#d4a853] text-[10px] font-mono">
          追溯码: {traceCode}
        </span>
      )}

      <div className="flex-1" />

      <button
        onClick={toggleHelp}
        className="relative p-1.5 rounded hover:bg-[#1a1a2e] transition-colors text-[#6a6a8e] hover:text-[#d4a853]"
      >
        <HelpCircle size={16} />
      </button>
    </div>
  )
}

function ToolBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-[#8a8aae] hover:text-[#d4a853] hover:bg-[#1a1a2e] transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
