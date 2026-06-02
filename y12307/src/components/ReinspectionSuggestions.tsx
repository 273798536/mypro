import { CheckCircle, Wrench } from 'lucide-react'
import { useBayesianStore } from '@/store/bayesianStore'
import { cn } from '@/lib/utils'

export default function ReinspectionSuggestions() {
  const suggestions = useBayesianStore(s => s.reinspectionSuggestions)

  if (suggestions.length === 0) {
    return (
      <div className="text-center text-zinc-500 text-sm py-8">
        暂无复检建议
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {suggestions.map(s => (
        <div
          key={s.id}
          className={cn(
            "border rounded p-3 text-xs space-y-1",
            s.priority === 'high' ? "bg-red-500/5 border-red-500/25" :
            s.priority === 'medium' ? "bg-amber-500/5 border-amber-500/25" :
            "bg-zinc-800/30 border-zinc-700/50"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                s.priority === 'high' ? "bg-red-500/15 text-red-400" :
                s.priority === 'medium' ? "bg-amber-500/15 text-amber-400" :
                "bg-zinc-600/30 text-zinc-400"
              )}>
                {s.priority === 'high' ? '高优' : s.priority === 'medium' ? '中优' : '低优'}
              </span>
              <span className="text-zinc-200 font-medium">{s.component}</span>
            </div>
            <span className="text-zinc-500 text-[10px]">
              {s.material}/{s.object}
            </span>
          </div>
          <div className="text-zinc-400 leading-relaxed flex items-start gap-1">
            <Wrench size={12} className="shrink-0 mt-0.5 text-zinc-500" />
            <span>{s.reason}</span>
          </div>
          {s.relatedEvidenceIds.length > 0 && (
            <div className="flex items-center gap-1 text-zinc-500">
              <CheckCircle size={10} />
              <span>关联证据: {s.relatedEvidenceIds.slice(0, 3).map(id => id.slice(-6)).join(', ')}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
