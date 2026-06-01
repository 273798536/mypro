import { useBayesianStore } from '@/store/bayesianStore'
import { cn } from '@/lib/utils'

export default function EvidenceExplanation() {
  const evidenceChain = useBayesianStore(s => s.evidenceChain)

  if (evidenceChain.length === 0) {
    return (
      <div className="text-center text-zinc-500 text-sm py-8">
        暂无证据链，请先录入证据
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-700" />

      <div className="space-y-3">
        {evidenceChain.map((item, idx) => (
          <div key={`${item.sourceId}-${idx}`} className="relative pl-6">
            <div className={cn(
              "absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2",
              item.sourceType === 'alarm' ? "border-amber-500 bg-amber-500/20" :
              item.sourceType === 'maintenance' ? "border-emerald-500 bg-emerald-500/20" :
              "border-sky-500 bg-sky-500/20"
            )} />

            <div className="text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                  item.sourceType === 'alarm' ? "bg-amber-500/15 text-amber-400" :
                  item.sourceType === 'maintenance' ? "bg-emerald-500/15 text-emerald-400" :
                  "bg-sky-500/15 text-sky-400"
                )}>
                  {item.sourceType === 'alarm' ? '报警' : item.sourceType === 'maintenance' ? '维修' : '报告'}
                </span>
                <span className="text-zinc-300">{item.description}</span>
              </div>
              <div className="text-zinc-500 pl-1">
                {item.contributionToRank}
              </div>
              <div className="flex items-center gap-2 pl-1">
                <span className="text-zinc-500">置信度:</span>
                <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      item.confidence > 0.7 ? "bg-emerald-500" :
                      item.confidence > 0.4 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${item.confidence * 100}%` }}
                  />
                </div>
                <span className="text-zinc-500 font-mono">{(item.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
