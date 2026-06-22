import { useStore } from '../store'
import { GitBranch, AlertTriangle, FileCheck, MessageSquare, Clock } from 'lucide-react'
import type { EventType } from '../types'

const eventIcons: Record<EventType, { icon: typeof Clock; color: string }> = {
  calc_step: { icon: GitBranch, color: 'text-blue-400 bg-blue-500/20' },
  anomaly_found: { icon: AlertTriangle, color: 'text-red-400 bg-red-500/20' },
  review: { icon: FileCheck, color: 'text-amber-400 bg-amber-500/20' },
  note_added: { icon: MessageSquare, color: 'text-zinc-400 bg-zinc-500/20' },
}

export default function EvidenceChain() {
  const { evidenceItems, selectedProblemId } = useStore()

  const items = evidenceItems
    .filter(e => e.problemId === selectedProblemId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
        暂无证据链记录
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-bold text-amber-400 tracking-wider uppercase">证据链</h2>
        <p className="text-[10px] text-zinc-500 mt-1">按时间倒序，追踪完整的因果链</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="relative">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />
          <div className="space-y-3">
            {items.map(item => {
              const config = eventIcons[item.eventType]
              const Icon = config.icon
              return (
                <div key={item.id} className="relative pl-8">
                  <div className={`absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center ${config.color}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-2.5">
                    <div className="text-[11px] text-zinc-300 leading-relaxed">{item.description}</div>
                    <div className="text-[9px] text-zinc-600 mt-1">
                      {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
