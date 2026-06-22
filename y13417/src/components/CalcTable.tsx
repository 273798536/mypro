import { useStore } from '../store'
import { AlertTriangle } from 'lucide-react'

export default function CalcTable() {
  const { calcSteps, selectedProblemId, anomalies } = useStore()

  const steps = calcSteps
    .filter(s => s.problemId === selectedProblemId)
    .sort((a, b) => a.stepOrder - b.stepOrder)

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-600 text-xs">
        暂无计算步骤
      </div>
    )
  }

  const anomalyStepIds = new Set(anomalies.filter(a => a.problemId === selectedProblemId).map(a => a.calcStepId))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500">
            <th className="py-2 px-3 text-left font-medium">步骤</th>
            <th className="py-2 px-3 text-left font-medium">节点</th>
            <th className="py-2 px-3 text-right font-medium font-mono">dfn</th>
            <th className="py-2 px-3 text-right font-medium font-mono">low</th>
            <th className="py-2 px-3 text-left font-medium">父节点</th>
            <th className="py-2 px-3 text-center font-medium">割点?</th>
            <th className="py-2 px-3 text-left font-medium">异常</th>
            <th className="py-2 px-3 text-left font-medium">备注</th>
          </tr>
        </thead>
        <tbody>
          {steps.map(step => {
            const hasAnomaly = anomalyStepIds.has(step.id) || step.anomalyType !== null
            const anomalyType = step.anomalyType
            return (
              <tr
                key={step.id}
                className={`border-b border-zinc-800/50 transition-colors ${
                  hasAnomaly
                    ? 'bg-red-500/5 hover:bg-red-500/10'
                    : 'hover:bg-zinc-800/50'
                }`}
              >
                <td className="py-2 px-3 text-zinc-500 font-mono">{step.stepOrder + 1}</td>
                <td className="py-2 px-3 font-semibold text-zinc-200 font-mono">{step.currentNode}</td>
                <td className={`py-2 px-3 text-right font-mono ${anomalyType === 'overflow' ? 'text-red-400' : 'text-zinc-300'}`}>
                  {step.dfn}
                </td>
                <td className={`py-2 px-3 text-right font-mono ${anomalyType === 'overflow' ? 'text-red-400' : 'text-zinc-300'}`}>
                  {step.low}
                </td>
                <td className="py-2 px-3 text-zinc-400 font-mono">{step.parent}</td>
                <td className="py-2 px-3 text-center">
                  {step.isCutCandidate ? (
                    <span className="inline-block px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px] font-medium">
                      是
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {anomalyType && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-red-400">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {anomalyType === 'overflow' ? '溢出' : anomalyType === 'empty_set' ? '空集' : anomalyType === 'missing_unit' ? '缺单位' : '边界'}
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-zinc-500 max-w-[200px] truncate" title={step.note}>
                  {step.note}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
