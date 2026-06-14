import { DEFAULT_BOUNDARY_CONFIG } from '../types'

export default function FormulaDisplay() {
  return (
    <div className="rounded-xl border border-[#1B3A5C]/10 bg-gradient-to-br from-[#0F2640] to-[#1B3A5C] p-6 shadow-lg">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8BA3BF]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2D9B83]" />
        张力计算公式
      </h3>

      <div className="mb-5 rounded-lg bg-[#0A1A2E]/80 p-5">
        <p className="font-mono text-2xl font-bold tracking-wide text-white">
          F = (W &times; g) / n
        </p>
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2">
          <span className="font-mono font-bold text-[#2D9B83]">F</span>
          <span className="text-[#C8D6E5]">张力值</span>
          <span className="ml-auto rounded bg-[#2D9B83]/20 px-2 py-0.5 font-mono text-xs text-[#2D9B83]">kN</span>
        </div>
        <div className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2">
          <span className="font-mono font-bold text-[#E8A838]">W</span>
          <span className="text-[#C8D6E5]">载荷重量</span>
          <span className="ml-auto rounded bg-[#E8A838]/20 px-2 py-0.5 font-mono text-xs text-[#E8A838]">kg</span>
        </div>
        <div className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2">
          <span className="font-mono font-bold text-[#7C8CF8]">g</span>
          <span className="text-[#C8D6E5]">重力加速度</span>
          <span className="ml-auto rounded bg-[#7C8CF8]/20 px-2 py-0.5 font-mono text-xs text-[#7C8CF8]">m/s&sup2;</span>
        </div>
        <div className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2">
          <span className="font-mono font-bold text-[#E06C9F]">n</span>
          <span className="text-[#C8D6E5]">滑轮组数</span>
          <span className="ml-auto rounded bg-[#E06C9F]/20 px-2 py-0.5 font-mono text-xs text-[#E06C9F]">正整数</span>
        </div>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8BA3BF]">边界判据</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#2D9B83]" />
            <span className="text-[#C8D6E5]">正常：F &le; {DEFAULT_BOUNDARY_CONFIG.normalMax} kN</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#E8A838]" />
            <span className="text-[#C8D6E5]">临界：{DEFAULT_BOUNDARY_CONFIG.normalMax} kN &lt; F &le; {DEFAULT_BOUNDARY_CONFIG.criticalMax} kN</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#C44D3F]" />
            <span className="text-[#C8D6E5]">超限：F &gt; {DEFAULT_BOUNDARY_CONFIG.criticalMax} kN</span>
          </div>
        </div>
      </div>
    </div>
  )
}
