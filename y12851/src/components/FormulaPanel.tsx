import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { METRIC_DEFS } from '@/utils/calcEngine'

export default function FormulaPanel() {
  const [open, setOpen] = useState(false)

  return (
    <div className="card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-ocean-200 hover:text-teal transition-colors"
      >
        <span>公式 · 单位 · 适用范围 · 失败原因</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-4 border-t border-ocean-700/50 pt-4">
          {METRIC_DEFS.map((def) => (
            <div key={def.key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-teal">{def.label}</span>
                {def.unit && (
                  <span className="badge bg-ocean-800 text-ocean-300 border border-ocean-600">
                    单位: {def.unit}
                  </span>
                )}
              </div>
              <div className="pl-3 space-y-1 text-xs">
                <div className="flex gap-2">
                  <span className="text-ocean-500 w-16 shrink-0">公式</span>
                  <code className="font-mono text-ocean-200">{def.formula}</code>
                </div>
                <div className="flex gap-2">
                  <span className="text-ocean-500 w-16 shrink-0">适用范围</span>
                  <span className="text-ocean-300">{def.range}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-ocean-500 w-16 shrink-0">失败原因</span>
                  <span className="text-warn">{def.failReason}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
