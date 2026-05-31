import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react'

export default function PropagationPanel() {
  const errorPropagation = useStore(s => s.errorPropagation)
  const variables = useStore(s => s.variables)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  if (!errorPropagation) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-xs">
        <GitBranch size={15} className="text-gray-600" />
        <span>请选择实验模板并设置参数</span>
      </div>
    )
  }

  const toggle = (idx: number) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <GitBranch size={15} className="text-[#00ff88]" />
        <span className="text-white text-sm font-semibold tracking-wide">误差传递</span>
      </div>

      <div className="bg-[#12122a] rounded-md p-2.5 border border-[#2d2d44]/50">
        <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-0.5">合成不确定度 σ</div>
        <span className="text-[#00ff88] font-mono text-lg font-semibold">
          {errorPropagation.combinedUncertainty.toPrecision(6)}
        </span>
      </div>

      <div className="text-gray-500 text-[10px] font-mono pl-1">
        σ_y = √(Σ (∂f/∂xᵢ)² · σ_xᵢ²)
      </div>

      <div className="flex flex-col gap-1">
        {errorPropagation.steps.map((step, idx) => {
          const variable = variables.find(v => v.id === step.variableId)
          const isOpen = expanded[idx] ?? false

          return (
            <div key={step.variableId} className="bg-[#12122a] rounded-md border border-[#2d2d44]/50 overflow-hidden">
              <button
                onClick={() => toggle(idx)}
                className="flex items-center gap-2 w-full text-left p-2 hover:bg-[#1a1a2e]/50 transition-colors"
              >
                {isOpen
                  ? <ChevronDown size={12} className="text-gray-400" />
                  : <ChevronRight size={12} className="text-gray-400" />
                }
                <span className="text-[#00ff88]/80 text-xs font-mono font-medium">{step.variableSymbol}</span>
                {variable && (
                  <span className="text-gray-500 text-[10px]">{variable.name}</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-16 h-1 bg-[#2d2d44] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00ff88] rounded-full"
                      style={{ width: `${step.percentage}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-[10px] font-mono w-10 text-right">
                    {step.percentage.toFixed(1)}%
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pb-2 pt-1 border-t border-[#2d2d44]/30 flex flex-col gap-1">
                  <div className="text-gray-400 text-[10px] font-mono">
                    ∂f/∂{step.variableSymbol} = {step.partialDerivative}
                  </div>
                  <div className="text-gray-300 text-[10px] font-mono">
                    = {step.partialValue.toPrecision(6)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-[10px]">贡献值:</span>
                    <span className="text-[#ffb347] font-mono text-[10px]">
                      {step.contribution.toPrecision(6)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
