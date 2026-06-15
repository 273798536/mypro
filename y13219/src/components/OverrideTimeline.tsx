import { OverrideRecord } from '@/store/useStore'
import { ArrowRight, Clock, User } from 'lucide-react'

export default function OverrideTimeline({ overrides }: { overrides: OverrideRecord[] }) {
  return (
    <div className="relative pl-4 border-l-2 border-amber/40 space-y-3 ml-1">
      {overrides.map((ovr) => (
        <div key={ovr.id} className="relative">
          <div className="absolute -left-[1.35rem] top-1 w-2.5 h-2.5 rounded-full bg-amber border-2 border-white" />
          <div className="bg-amber/5 rounded-lg p-3 border border-amber/15">
            <div className="flex items-center gap-3 text-xs text-driftwood mb-1.5">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {new Date(ovr.timestamp).toLocaleString('zh-CN')}
              </span>
              <span className="flex items-center gap-1">
                <User size={10} />
                {ovr.operator}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm mb-1.5">
              <span className="px-2 py-0.5 bg-ochre/10 text-ochre rounded text-xs line-through">
                {ovr.oldValue}
              </span>
              <ArrowRight size={14} className="text-amber shrink-0" />
              <span className="px-2 py-0.5 bg-sage/15 text-moss rounded text-xs font-medium">
                {ovr.newValue}
              </span>
            </div>
            <p className="text-xs text-inkstone/70 leading-relaxed">{ovr.reason}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
