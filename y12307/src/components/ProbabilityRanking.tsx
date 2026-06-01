import { AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { useBayesianStore } from '@/store/bayesianStore'
import { cn } from '@/lib/utils'

export default function ProbabilityRanking() {
  const probabilities = useBayesianStore(s => s.probabilities)

  if (probabilities.length === 0) {
    return (
      <div className="text-center text-zinc-500 text-sm py-8">
        暂无概率排序数据，请先录入证据
      </div>
    )
  }

  const maxProb = Math.max(...probabilities.map(p => p.probability))

  return (
    <div className="space-y-3">
      {probabilities.map((prob, idx) => (
        <div key={prob.component} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-5 h-5 rounded text-xs flex items-center justify-center font-mono font-bold",
                idx === 0 ? "bg-amber-500/30 text-amber-300" : "bg-zinc-700/50 text-zinc-400"
              )}>
                {idx + 1}
              </span>
              <span className="text-zinc-200">{prob.component}</span>
              {prob.rankChanged && (
                <span className="flex items-center gap-0.5 text-xs">
                  {prob.currentRank < prob.previousRank ? (
                    <ArrowUp size={12} className="text-emerald-400" />
                  ) : (
                    <ArrowDown size={12} className="text-red-400" />
                  )}
                  <span className="text-zinc-500">
                    {prob.previousRank}→{prob.currentRank}
                  </span>
                </span>
              )}
              {!prob.rankChanged && idx > 0 && (
                <Minus size={12} className="text-zinc-600" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-xs">{prob.material}/{prob.object}</span>
              <span className="font-mono text-amber-400 font-bold">
                {(prob.probability * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                idx === 0 ? "bg-amber-500/70" : idx === 1 ? "bg-sky-500/50" : "bg-zinc-500/40"
              )}
              style={{ width: `${maxProb > 0 ? (prob.probability / maxProb) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}

      {probabilities.some(p => p.rankChanged) && (
        <div className="flex items-center gap-1 text-xs text-amber-400/70 mt-2">
          <AlertTriangle size={12} /> 排序已变化，证据解释和复检建议已同步更新
        </div>
      )}
    </div>
  )
}
