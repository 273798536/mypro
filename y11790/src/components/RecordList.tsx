import { usePulleyStore } from '../store/pulleyStore'
import { getHighestLevel } from '../utils/validators'
import type { PulleyRecord } from '../types'
import { Plus, Circle } from 'lucide-react'

function RecordItem({
  rec,
  isActive,
  onClick,
  warningLevel,
}: {
  rec: PulleyRecord
  isActive: boolean
  onClick: () => void
  warningLevel: string | null
}) {
  const dotColor =
    warningLevel === 'error'
      ? 'text-[#ef4444]'
      : warningLevel === 'warning'
        ? 'text-[#ff6b35]'
        : warningLevel === 'info'
          ? 'text-[#ffbb33]'
          : 'text-[#00d4aa]'

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-[#ff6b35]/15 border border-[#ff6b35]/40'
          : 'bg-[#1a2332]/60 border border-transparent hover:bg-[#253345]'
      }`}
    >
      <Circle className={`w-2.5 h-2.5 fill-current ${dotColor}`} />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-xs text-white truncate font-mono">{rec.name}</div>
        <div className="text-[10px] text-[#667788] font-mono">
          {rec.pulleyCount}滑轮 · {rec.objectWeight}{rec.weightUnit} · μ={rec.frictionCoefficient}
        </div>
      </div>
      <div className="text-[10px] text-[#667788] font-mono">{rec.source}</div>
    </button>
  )
}

export default function RecordList() {
  const records = usePulleyStore((s) => s.records)
  const allWarnings = usePulleyStore((s) => s.warnings)
  const activeRecordId = usePulleyStore((s) => s.activeRecordId)
  const selectRecord = usePulleyStore((s) => s.selectRecord)
  const addRecord = usePulleyStore((s) => s.addRecord)

  const handleAdd = () => {
    const newRecord: PulleyRecord = {
      id: crypto.randomUUID(),
      name: '新记录',
      pulleyCount: 2,
      movingPulleys: 1,
      fixedPulleys: 1,
      objectWeight: 10,
      weightUnit: 'N',
      frictionCoefficient: 0.1,
      ropeLength: 2,
      ropeLengthUnit: 'm',
      source: '手动创建',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addRecord(newRecord)
  }

  return (
    <div className="bg-[#1a2332]/80 rounded-lg p-3 border border-[#253345]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider">记录列表</h3>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 text-[10px] text-[#ff6b35] font-mono hover:text-white transition-colors"
        >
          <Plus className="w-3 h-3" />
          新增
        </button>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {records.map((rec) => (
          <RecordItem
            key={rec.id}
            rec={rec}
            isActive={rec.id === activeRecordId}
            onClick={() => selectRecord(rec.id)}
            warningLevel={getHighestLevel(allWarnings[rec.id] || [])}
          />
        ))}
      </div>
    </div>
  )
}
