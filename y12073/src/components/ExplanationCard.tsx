import { useEffect, useRef } from 'react'
import katex from 'katex'
import { useStore } from '@/store/useStore'
import { getSurfaceById } from '@/data/surfaces'
import { evaluateProtections, getTriggeredResults } from '@/utils/protectionEngine'
import { BookOpen, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function ExplanationCard() {
  const formulaRef = useRef<HTMLDivElement>(null)
  const activeSurfaceId = useStore(s => s.activeSurfaceId)
  const params = useStore(s => s.params)
  const surface = getSurfaceById(activeSurfaceId)
  const protectionResults = evaluateProtections(activeSurfaceId, params)
  const triggered = getTriggeredResults(protectionResults)

  useEffect(() => {
    if (!formulaRef.current || !surface) return
    try {
      katex.render(surface.formula, formulaRef.current, {
        throwOnError: false,
        displayMode: true,
      })
    } catch {
      formulaRef.current.textContent = surface.formula
    }
  }, [surface])

  if (!surface) return null

  const paramDescriptions = surface.paramDefs.map(def => {
    const value = params[def.key] ?? 0
    return `${def.label} = ${value.toFixed(2)}`
  })

  return (
    <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-[#d4a853]" />
        <h2 className="text-sm font-semibold text-[#e8e6e1] tracking-wide uppercase">讲解</h2>
      </div>

      <div className="space-y-2">
        <h3 className="text-base text-[#e8e6e1] font-['Cormorant_Garamond',serif]">
          {surface.name}
        </h3>
        <div
          ref={formulaRef}
          className="text-[#d4a853] text-sm py-2 px-3 bg-white/[0.02] rounded-md border border-white/[0.04] overflow-x-auto"
        />
        <p className="text-xs text-[#e8e6e1]/50 leading-relaxed font-mono">
          {surface.formulaSource.detail}
        </p>
      </div>

      <div className="border-t border-white/[0.06] pt-2">
        <h4 className="text-[10px] text-[#e8e6e1]/40 uppercase mb-1.5">当前参数</h4>
        <div className="flex flex-wrap gap-1.5">
          {paramDescriptions.map(desc => (
            <span
              key={desc}
              className="text-[10px] font-mono px-2 py-0.5 bg-white/[0.04] rounded-md text-[#e8e6e1]/70"
            >
              {desc}
            </span>
          ))}
        </div>
      </div>

      {triggered.length > 0 && (
        <div className="border-t border-white/[0.06] pt-2 space-y-1.5">
          <h4 className="text-[10px] text-[#e8e6e1]/40 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            参数保护
          </h4>
          {triggered.map(t => (
            <div
              key={t.ruleId}
              className={`text-[10px] font-mono px-2 py-1.5 rounded-md border ${
                t.action === 'block'
                  ? 'bg-red-500/10 border-red-500/20 text-red-300'
                  : t.action === 'clamp'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}

      {triggered.length === 0 && (
        <div className="border-t border-white/[0.06] pt-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            所有参数在安全范围内
          </div>
        </div>
      )}

      <div className="border-t border-white/[0.06] pt-2">
        <h4 className="text-[10px] text-[#e8e6e1]/40 uppercase mb-1">着色规则</h4>
        <div className="text-[10px] font-mono text-[#e8e6e1]/50">
          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] mr-1 ${
            surface.colorRule.type === 'formula'
              ? 'bg-blue-500/10 text-blue-300'
              : surface.colorRule.type === 'color_rule'
              ? 'bg-purple-500/10 text-purple-300'
              : 'bg-teal-500/10 text-teal-300'
          }`}>
            {surface.colorRule.type === 'formula' ? '公式' : surface.colorRule.type === 'color_rule' ? '颜色' : '展陈'}
          </span>
          {surface.colorRule.detail}
        </div>
      </div>
    </div>
  )
}
