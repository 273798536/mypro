import { useSimStore } from '@/store/useSimStore'
import { X, ArrowRight } from 'lucide-react'

export default function ComparisonView() {
  const comparisonPair = useSimStore(s => s.comparisonPair)
  const showComparison = useSimStore(s => s.showComparison)
  const closeComparison = useSimStore(s => s.closeComparison)

  if (!showComparison || !comparisonPair) return null

  const { oldResult, newResult, paramDiff } = comparisonPair

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#0d1117]/95 backdrop-blur border border-[#00d4ff]/30 rounded-xl p-4 w-[600px] max-w-[90vw]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#00d4ff] tracking-wider uppercase">新旧结果对比</h3>
        <button onClick={closeComparison} className="text-[#8892a4] hover:text-[#ff3366] transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1f2e] rounded-lg p-3">
          <p className="text-[10px] text-[#8892a4] uppercase tracking-wider mb-2">旧参数</p>
          <ParamRow label="初速度" value={`${oldResult.params.velocity} m/s`} />
          <ParamRow label="角度" value={`${oldResult.params.angle}°`} />
          <ParamRow label="阻力系数" value={`${oldResult.params.dragCoefficient}`} />
          <div className="border-t border-[#2a3040] mt-2 pt-2">
            <ParamRow label="射程" value={`${oldResult.maxRange} m`} />
            <ParamRow label="最大高度" value={`${oldResult.maxHeight} m`} />
            <ParamRow label="飞行时间" value={`${oldResult.flightTime} s`} />
          </div>
        </div>

        <div className="bg-[#1a1f2e] rounded-lg p-3">
          <p className="text-[10px] text-[#8892a4] uppercase tracking-wider mb-2">新参数</p>
          <ParamRow label="初速度" value={`${newResult.params.velocity} m/s`} highlight={'velocity' in paramDiff} />
          <ParamRow label="角度" value={`${newResult.params.angle}°`} highlight={'angle' in paramDiff} />
          <ParamRow label="阻力系数" value={`${newResult.params.dragCoefficient}`} highlight={'dragCoefficient' in paramDiff} />
          <div className="border-t border-[#2a3040] mt-2 pt-2">
            <ParamRow label="射程" value={`${newResult.maxRange} m`} />
            <ParamRow label="最大高度" value={`${newResult.maxHeight} m`} />
            <ParamRow label="飞行时间" value={`${newResult.flightTime} s`} />
          </div>
        </div>
      </div>

      <div className="mt-3 bg-[#0a1520] rounded-lg p-2">
        <p className="text-[10px] text-[#00d4ff] font-mono">
          <span className="text-[#8892a4]">参数差异：</span>
          {Object.keys(paramDiff).length === 0
            ? '无差异'
            : Object.entries(paramDiff).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1 mr-3">
                  <span className="text-[#ff6b35]">{k}</span>
                  <ArrowRight size={10} className="text-[#8892a4]" />
                  <span className="text-[#00ff88]">{String(v)}</span>
                </span>
              ))}
        </p>
      </div>
    </div>
  )
}

function ParamRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between text-xs font-mono py-0.5 ${highlight ? 'text-[#ff6b35]' : 'text-[#c8d0dc]'}`}>
      <span className="text-[#8892a4]">{label}</span>
      <span>{value}</span>
    </div>
  )
}
