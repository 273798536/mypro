import { useState } from 'react'
import { usePulleyStore } from '../store/pulleyStore'
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'

export default function WarningBar() {
  const warnings = usePulleyStore((s) => s.getActiveWarnings())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (warnings.length === 0) return null

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const iconFor = (level: string) => {
    if (level === 'error') return <AlertCircle className="w-4 h-4 text-[#ef4444]" />
    if (level === 'warning') return <AlertTriangle className="w-4 h-4 text-[#ff6b35]" />
    return <Info className="w-4 h-4 text-[#ffbb33]" />
  }

  const bgFor = (level: string) => {
    if (level === 'error') return 'bg-[#ef4444]/10 border-[#ef4444]/30'
    if (level === 'warning') return 'bg-[#ff6b35]/10 border-[#ff6b35]/30'
    return 'bg-[#ffbb33]/10 border-[#ffbb33]/30'
  }

  const hasErrors = warnings.some((w) => w.level === 'error')

  return (
    <div className={`rounded-lg border ${hasErrors ? 'border-[#ef4444]/40' : 'border-[#ff6b35]/40'} overflow-hidden`}>
      <div className={`px-3 py-2 ${hasErrors ? 'bg-[#ef4444]/10' : 'bg-[#ff6b35]/10'} flex items-center gap-2`}>
        {hasErrors ? (
          <AlertCircle className="w-4 h-4 text-[#ef4444]" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-[#ff6b35]" />
        )}
        <span className="text-xs font-mono text-white">
          {warnings.length} 条提示（{warnings.filter((w) => w.level === 'error').length} 错误）
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {warnings.map((w) => (
          <div key={w.id} className={`border-b border-[#253345] last:border-b-0`}>
            <div
              className={`px-3 py-2 flex items-start gap-2 cursor-pointer ${bgFor(w.level)} border`}
              onClick={() => toggle(w.id)}
            >
              {iconFor(w.level)}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white font-mono">{w.message}</div>
              </div>
              {expanded.has(w.id) ? (
                <ChevronUp className="w-3 h-3 text-[#667788] flex-shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 text-[#667788] flex-shrink-0" />
              )}
            </div>
            {expanded.has(w.id) && (
              <div className="px-3 py-2 bg-[#0d1117]/50">
                <div className="text-[11px] text-[#8899aa] font-mono leading-relaxed">
                  {w.physicsExplanation}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
