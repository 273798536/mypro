import { useStore } from '@/store/useStore'
import { presetUnits } from '@/utils/templates'
import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react'

export default function UnitCheckPanel() {
  const unitCheckResult = useStore(s => s.unitCheckResult)
  const variables = useStore(s => s.variables)

  const unitMap = Object.fromEntries(presetUnits.map(u => [u.id, u]))

  if (!unitCheckResult) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-xs">
        <CheckCircle size={15} className="text-gray-600" />
        <span>单位校验未执行</span>
      </div>
    )
  }

  if (unitCheckResult.passed) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle size={15} className="text-[#00ff88]" />
          <span className="text-white text-sm font-semibold tracking-wide">单位校验</span>
        </div>
        <div className="bg-[#12122a] rounded-md p-2.5 border border-[#00ff88]/20 flex items-center gap-2">
          <CheckCircle size={16} className="text-[#00ff88]" />
          <span className="text-[#00ff88] text-xs font-medium">校验通过 — 量纲一致</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle size={15} className="text-[#ffb347]" />
        <span className="text-white text-sm font-semibold tracking-wide">单位校验</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {unitCheckResult.conflicts.map(conflict => {
          const sourceVar = variables.find(v => v.id === conflict.sourceVariableId)

          return (
            <div key={conflict.id} className="bg-[#12122a] rounded-md p-2.5 border border-[#ffb347]/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={12} className="text-red-400" />
                <span className="text-white text-[10px] font-medium">
                  {conflict.nodeType === 'add' ? '加法' : conflict.nodeType === 'subtract' ? '减法' : '赋值'}
                  {' '}量纲不一致
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono mb-1 pl-4">
                <span className="text-[#ffb347] bg-[#ffb347]/10 px-1.5 py-0.5 rounded">{conflict.leftUnit}</span>
                <ArrowRight size={10} className="text-gray-600" />
                <span className="text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">{conflict.rightUnit}</span>
              </div>

              {sourceVar && (
                <div className="text-gray-500 text-[10px] pl-4 mb-1">
                  来源: <span className="text-white">{sourceVar.name}</span>
                  <span className="text-[#00ff88]/60 ml-1">({sourceVar.symbol})</span>
                  {sourceVar.unitId && unitMap[sourceVar.unitId] && (
                    <span className="ml-1 text-gray-400">[{unitMap[sourceVar.unitId].symbol}]</span>
                  )}
                </div>
              )}

              {conflict.sourceRow >= 0 && (
                <div className="text-gray-500 text-[10px] pl-4 mb-1">
                  数据行: {conflict.sourceRow}
                </div>
              )}

              <div className="text-[#ffb347]/80 text-[10px] pl-4">
                {conflict.suggestion}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
