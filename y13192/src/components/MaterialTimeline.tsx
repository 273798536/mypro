import { Clock, User, ArrowRight, FileText } from 'lucide-react'
import { materialChanges } from '@/data/mockData'

const sorted = [...materialChanges].sort((a, b) => a.changedAt - b.changedAt)

function formatTime(t: number) {
  const d = new Date(t)
  return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MaterialTimeline() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] p-6">
      <h2 className="mb-8 text-xl font-bold text-white">口径变更时间线</h2>
      <div className="relative ml-4">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-amber-500" />
        {sorted.map((change) => (
          <div key={change.id} className="relative flex gap-6 pb-8 last:pb-0">
            <div className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-amber-500 bg-[#1a1a2e]">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            </div>
            <div className="flex-1 rounded-lg border border-gray-700/50 bg-[#1a1a2e]/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                <Clock size={14} />
                <span>{formatTime(change.changedAt)}</span>
                <span className="text-gray-600">|</span>
                <User size={14} />
                <span>{change.changedBy}</span>
              </div>
              <div className="mb-1 text-base font-semibold text-white">{change.materialName}</div>
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="rounded bg-gray-700/60 px-2 py-0.5 text-gray-300">{change.fieldChanged}</span>
              </div>
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="text-gray-500">{change.oldValue}</span>
                <ArrowRight size={14} className="text-amber-500" />
                <span className="font-medium text-amber-500">{change.newValue}</span>
              </div>
              <div className="flex items-start gap-1.5 text-xs text-gray-500">
                <FileText size={12} className="mt-0.5 shrink-0" />
                <span>{change.reason}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
