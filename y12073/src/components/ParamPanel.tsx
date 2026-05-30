import { useStore } from '@/store/useStore'
import { getSurfaceById } from '@/data/surfaces'
import { evaluateProtections } from '@/utils/protectionEngine'
import { AlertTriangle, Shield, ShieldOff, RotateCcw } from 'lucide-react'

export default function ParamPanel() {
  const activeSurfaceId = useStore(s => s.activeSurfaceId)
  const params = useStore(s => s.params)
  const setParam = useStore(s => s.setParam)
  const setActiveSurface = useStore(s => s.setActiveSurface)
  const surface = getSurfaceById(activeSurfaceId)
  const protectionResults = evaluateProtections(activeSurfaceId, params)
  const triggered = protectionResults.filter(r => r.triggered)

  if (!surface) return null

  const statusColor = triggered.some(r => r.action === 'block')
    ? 'text-red-400'
    : triggered.some(r => r.action === 'warn')
    ? 'text-amber-400'
    : 'text-emerald-400'

  return (
    <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#e8e6e1] tracking-wide uppercase">参数控制</h2>
        <div className="flex items-center gap-2">
          {triggered.length === 0 ? (
            <Shield className="w-4 h-4 text-emerald-400" />
          ) : triggered.some(r => r.action === 'block') ? (
            <ShieldOff className="w-4 h-4 text-red-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
          <span className={`text-xs font-mono ${statusColor}`}>
            {triggered.length === 0 ? '安全' : `${triggered.length}条触发`}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {surface.paramDefs.map(def => {
          const value = params[def.key] ?? def.min
          const rule = triggered.find(r => {
            const ruleData = protectionResults.find(pr => pr.ruleId === r.ruleId)
            return false
          })
          const isTriggered = triggered.some(t => {
            const ruleObj = evaluateProtections(activeSurfaceId, { [def.key]: value })
            return ruleObj.some(r => r.triggered && r.action !== 'clamp')
          })
          const clampResult = protectionResults.find(
            r => r.triggered && r.action === 'clamp' && r.clampedValue !== undefined
          )

          return (
            <div key={def.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#e8e6e1]/70 font-mono">{def.label}</label>
                <span className="text-xs font-mono text-[#d4a853]">{value.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={def.min}
                max={def.max}
                step={def.step}
                value={value}
                onChange={e => setParam(def.key, parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                  bg-white/[0.08] accent-[#d4a853]
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3.5
                  [&::-webkit-slider-thumb]:h-3.5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-[#d4a853]
                  [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(212,168,83,0.4)]
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#e8e6e1]/30 font-mono">
                <span>{def.min}</span>
                <span>{def.max}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-white/[0.06] pt-3">
        <h3 className="text-xs text-[#e8e6e1]/50 mb-2">曲面类型</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {['ellipsoid', 'hyperboloid', 'paraboloid', 'saddle', 'sine', 'mobius'].map(id => {
            const s = getSurfaceById(id)
            if (!s) return null
            return (
              <button
                key={id}
                onClick={() => setActiveSurface(id)}
                className={`text-[10px] px-2 py-1.5 rounded-md font-mono transition-all
                  ${activeSurfaceId === id
                    ? 'bg-[#d4a853]/20 text-[#d4a853] border border-[#d4a853]/30'
                    : 'bg-white/[0.03] text-[#e8e6e1]/50 border border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
              >
                {s.name}
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={() => {
          const s = getSurfaceById(activeSurfaceId)
          if (s) useStore.getState().setParams({ ...s.defaultParams })
        }}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-[#e8e6e1]/40
          hover:text-[#e8e6e1]/70 py-1.5 rounded-md border border-white/[0.06] hover:border-white/[0.12]
          transition-all"
      >
        <RotateCcw className="w-3 h-3" />
        重置参数
      </button>
    </div>
  )
}
