import { useMemo } from 'react'
import { usePulleyStore } from '../store/pulleyStore'
import { Clock } from 'lucide-react'

export default function CorrectionTimeline() {
  const activeRecordId = usePulleyStore((s) => s.activeRecordId)
  const allCorrections = usePulleyStore((s) => s.corrections)
  const corrections = useMemo(
    () => allCorrections.filter((c) => c.recordId === activeRecordId),
    [allCorrections, activeRecordId]
  )

  if (corrections.length === 0) {
    return (
      <div className="bg-[#1a2332]/80 rounded-lg p-3 border border-[#253345]">
        <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider mb-2">修正历史</h3>
        <div className="text-[11px] text-[#556677] font-mono text-center py-2">暂无修正记录</div>
      </div>
    )
  }

  const fieldLabels: Record<string, string> = {
    pulleyCount: '滑轮总数',
    movingPulleys: '动滑轮数',
    fixedPulleys: '定滑轮数',
    objectWeight: '物体重量',
    weightUnit: '重量单位',
    frictionCoefficient: '摩擦系数',
    ropeLength: '绳长',
    ropeLengthUnit: '绳长单位',
    source: '数据来源',
  }

  return (
    <div className="bg-[#1a2332]/80 rounded-lg p-3 border border-[#253345]">
      <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider mb-2">修正历史</h3>
      <div className="space-y-2 max-h-36 overflow-y-auto">
        {corrections.map((c) => (
          <div key={c.id} className="flex items-start gap-2">
            <div className="mt-1">
              <Clock className="w-3 h-3 text-[#ff6b35]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-white">
                <span className="text-[#8899aa]">{fieldLabels[c.fieldChanged] || c.fieldChanged}</span>
                {' → '}
                <span className="text-[#ef4444] line-through">{c.oldValue}</span>
                {' → '}
                <span className="text-[#00d4aa]">{c.newValue}</span>
              </div>
              <div className="text-[10px] font-mono text-[#556677]">
                {c.reason} · {new Date(c.correctedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
