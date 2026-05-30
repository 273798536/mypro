import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { getSurfaceById } from '@/data/surfaces'
import { evaluateProtections, getTriggeredResults } from '@/utils/protectionEngine'
import { getRulesForSurface } from '@/data/protectionRules'
import { ChevronDown, ChevronRight, FileText, Palette, Camera, Link2 } from 'lucide-react'
import type { TraceSource } from '@/types'

function SourceIcon({ type }: { type: TraceSource['type'] }) {
  switch (type) {
    case 'formula': return <FileText className="w-3 h-3 text-blue-400" />
    case 'color_rule': return <Palette className="w-3 h-3 text-purple-400" />
    case 'exhibit_screenshot': return <Camera className="w-3 h-3 text-teal-400" />
  }
}

function SourceBadge({ type }: { type: TraceSource['type'] }) {
  const labels = { formula: '公式', color_rule: '颜色规则', exhibit_screenshot: '展陈截图' }
  const colors = {
    formula: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    color_rule: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    exhibit_screenshot: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border ${colors[type]}`}>
      <SourceIcon type={type} />
      {labels[type]}
    </span>
  )
}

function TraceItem({ source, expanded: defaultExpanded = false }: { source: TraceSource; expanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div className="border border-white/[0.06] rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3 text-[#e8e6e1]/30" /> : <ChevronRight className="w-3 h-3 text-[#e8e6e1]/30" />}
        <SourceIcon type={source.type} />
        <span className="text-[10px] font-mono text-[#e8e6e1]/70 flex-1">{source.label}</span>
        <SourceBadge type={source.type} />
      </button>
      {expanded && (
        <div className="px-3 pb-2 pt-1 space-y-1.5 bg-white/[0.01]">
          <div className="flex items-start gap-1.5">
            <Link2 className="w-3 h-3 text-[#d4a853] mt-0.5 shrink-0" />
            <div>
              <div className="text-[9px] text-[#e8e6e1]/40 uppercase">引用</div>
              <div className="text-[10px] font-mono text-[#e8e6e1]/60">{source.reference}</div>
            </div>
          </div>
          <div className="text-[10px] text-[#e8e6e1]/50 leading-relaxed">{source.detail}</div>
        </div>
      )}
    </div>
  )
}

export default function TracePanel() {
  const activeSurfaceId = useStore(s => s.activeSurfaceId)
  const params = useStore(s => s.params)
  const surface = getSurfaceById(activeSurfaceId)
  const protectionResults = evaluateProtections(activeSurfaceId, params)
  const triggered = getTriggeredResults(protectionResults)
  const rules = getRulesForSurface(activeSurfaceId)

  if (!surface) return null

  const paramSources = surface.paramDefs.map(def => def.source)
  const formulaSource = surface.formulaSource
  const colorSource = surface.colorRule
  const ruleSources = triggered.map(t => ({ ruleId: t.ruleId, source: t.source, action: t.action }))

  return (
    <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Link2 className="w-3.5 h-3.5 text-[#d4a853]" />
        <h2 className="text-sm font-semibold text-[#e8e6e1] tracking-wide uppercase">来源追溯</h2>
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] text-[#e8e6e1]/40 uppercase">公式来源</h3>
        <TraceItem source={formulaSource} expanded />
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] text-[#e8e6e1]/40 uppercase">参数来源</h3>
        {paramSources.map((src, i) => (
          <TraceItem key={i} source={src} />
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] text-[#e8e6e1]/40 uppercase">着色来源</h3>
        <TraceItem source={colorSource} />
      </div>

      {ruleSources.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] text-[#e8e6e1]/40 uppercase">保护规则来源</h3>
          {ruleSources.map(rs => (
            <div key={rs.ruleId}>
              <TraceItem source={rs.source} expanded />
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-white/[0.06] pt-2">
        <div className="text-[9px] text-[#e8e6e1]/30 font-mono">
          共 {rules.length} 条保护规则 · {triggered.length} 条已触发
        </div>
      </div>
    </div>
  )
}
