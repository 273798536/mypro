import { useStore } from '@/store/useStore'
import { presetUnits } from '@/utils/templates'
import { evaluateFormula } from '@/utils/errorPropagation'
import { Sliders, Info } from 'lucide-react'
import FormulaDisplay from './FormulaDisplay'

export default function ParamPanel() {
  const variables = useStore(s => s.variables)
  const formulas = useStore(s => s.formulas)
  const errorPropagation = useStore(s => s.errorPropagation)
  const setVariableValue = useStore(s => s.setVariableValue)
  const setVariableUncertainty = useStore(s => s.setVariableUncertainty)

  const unitMap = Object.fromEntries(presetUnits.map(u => [u.id, u]))

  const inputVars = variables.filter(v => v.uncertainty > 0)
  const resultVar = errorPropagation
    ? variables.find(v => formulas.some(f => f.resultVariableId === v.id))
    : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-white mb-1">
        <Sliders size={15} className="text-[#00ff88]" />
        <span className="text-sm font-semibold tracking-wide">参数控制</span>
      </div>

      {inputVars.map(v => {
        const unit = unitMap[v.unitId]
        const min = v.currentValue < 0.2 ? 0.1 : v.currentValue * 0.5
        const max = v.currentValue < 0.2 ? v.currentValue * 2 : v.currentValue * 1.5
        const step = v.uncertainty / 10 || 0.001
        const ratio = v.currentValue > 0 ? Math.min(v.uncertainty / v.currentValue, 1) : 0

        return (
          <div key={v.id} className="bg-[#12122a] rounded-md p-2.5 border border-[#2d2d44]/50">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xs font-medium">{v.name}</span>
                <span className="text-[#00ff88]/70 text-xs font-mono">{v.symbol}</span>
                {unit && <span className="text-gray-500 text-[10px]">{unit.symbol}</span>}
              </div>
              <span className="text-[#00ff88] font-mono text-xs font-medium">{v.currentValue.toPrecision(6)}</span>
            </div>

            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={v.currentValue}
              onChange={e => setVariableValue(v.id, parseFloat(e.target.value))}
              className="w-full"
            />

            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-1">
                <Info size={10} className="text-gray-500" />
                <span className="text-gray-500 text-[10px]">σ</span>
              </div>
              <input
                type="number"
                value={v.uncertainty}
                step={v.uncertainty / 10 || 0.0001}
                onChange={e => setVariableUncertainty(v.id, parseFloat(e.target.value) || 0)}
                className="w-20 text-gray-300 font-mono text-xs px-1.5 py-0.5 text-right"
              />
            </div>

            <div className="mt-1 h-0.5 bg-[#2d2d44] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00ff88]/60 rounded-full transition-all duration-200"
                style={{ width: `${Math.max(ratio * 100, 1)}%` }}
              />
            </div>
          </div>
        )
      })}

      {formulas.length > 0 && (
        <div className="bg-[#12122a] rounded-md p-2.5 border border-[#2d2d44]/50">
          <span className="text-gray-500 text-[10px] uppercase tracking-widest block mb-1">公式</span>
          <FormulaDisplay expression={formulas[0].expression} />
        </div>
      )}

      {errorPropagation && resultVar && (
        <div className="bg-[#12122a] rounded-md p-2.5 border border-[#00ff88]/20">
          <span className="text-gray-500 text-[10px] uppercase tracking-widest block mb-1">计算结果</span>
          <div className="flex items-center gap-2">
            <span className="text-white text-xs">{resultVar.name}</span>
            <span className="text-[#00ff88] font-mono text-sm font-semibold">
              {evaluateFormula(formulas[0], variables).toPrecision(6)}
            </span>
            <span className="text-[#ffb347] font-mono text-xs">
              ± {errorPropagation.combinedUncertainty.toPrecision(4)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
