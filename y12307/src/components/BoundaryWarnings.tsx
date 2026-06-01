import { AlertTriangle, AlertCircle } from 'lucide-react'
import { useBayesianStore } from '@/store/bayesianStore'
import { cn } from '@/lib/utils'

export default function BoundaryWarnings() {
  const warnings = useBayesianStore(s => s.boundaryWarnings)

  if (warnings.length === 0) return null

  return (
    <div className="space-y-2">
      {warnings.map(w => (
        <div
          key={w.id}
          className={cn(
            "border rounded p-3 text-xs space-y-1",
            w.severity === 'error'
              ? "bg-red-500/8 border-red-500/30"
              : "bg-amber-500/8 border-amber-500/30"
          )}
        >
          <div className="flex items-center gap-2">
            {w.severity === 'error' ? (
              <AlertCircle size={14} className="text-red-400" />
            ) : (
              <AlertTriangle size={14} className="text-amber-400" />
            )}
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium",
              w.type === 'sample_too_small' ? "bg-red-500/15 text-red-400" :
              w.type === 'prior_too_strong' ? "bg-amber-500/15 text-amber-400" :
              "bg-yellow-500/15 text-yellow-400"
            )}>
              {w.type === 'sample_too_small' ? '样本过少' :
               w.type === 'prior_too_strong' ? '先验过强' : '标签滞后'}
            </span>
            <span className="text-zinc-300 font-medium">{w.component}</span>
            <span className="text-zinc-500 text-[10px] ml-auto">{w.material}/{w.object}</span>
          </div>
          <div className="text-zinc-400 leading-relaxed pl-6">
            {w.detail}
          </div>
        </div>
      ))}
    </div>
  )
}
