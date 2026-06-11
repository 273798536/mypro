import { useStore } from '@/store/useStore'
import { AlertTriangle, ChevronRight } from 'lucide-react'

export default function CollisionList() {
  const collisions = useStore((s) => s.collisions)
  const bars = useStore((s) => s.bars)
  const currentFrame = useStore((s) => s.currentFrame)
  const filter = useStore((s) => s.filter)
  const selectedCollisionId = useStore((s) => s.selectedCollisionId)
  const setSelectedCollisionId = useStore((s) => s.setSelectedCollisionId)
  const setSelectedObjectId = useStore((s) => s.setSelectedObjectId)

  const filtered = collisions.filter((c) => {
    if (filter.collisionStatus !== 'all' && c.status !== filter.collisionStatus) return false
    if (filter.objectType !== 'all') {
      const barA = bars.find((b) => b.id === c.objectAId)
      const barB = bars.find((b) => b.id === c.objectBId)
      if (barA?.type !== filter.objectType && barB?.type !== filter.objectType) return false
    }
    return true
  })

  const statusColor: Record<string, string> = {
    collision: 'bg-red-500/20 text-red-400 border-red-500/30',
    pending_review: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    safe: 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30',
  }

  const statusLabel: Record<string, string> = {
    collision: '碰撞',
    pending_review: '待确认',
    safe: '安全',
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle size={12} /> 碰撞检测
        </h3>
        <span className="text-[10px] text-zinc-600">{filtered.length} 项</span>
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-4">当前筛选条件下无碰撞记录</p>
      ) : (
        filtered.map((c) => {
          const barA = bars.find((b) => b.id === c.objectAId)
          const barB = bars.find((b) => b.id === c.objectBId)
          const isCurrentFrame = c.frameIndex === currentFrame
          const isSelected = selectedCollisionId === c.id

          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCollisionId(c.id)
                setSelectedObjectId(c.objectAId)
              }}
              className={`w-full text-left rounded-lg px-3 py-2 transition-all ${
                isSelected
                  ? 'bg-zinc-700/50 border border-zinc-600'
                  : 'bg-zinc-900/40 border border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronRight size={12} className={`transition-transform ${isSelected ? 'rotate-90 text-amber-400' : 'text-zinc-600'}`} />
                  <span className="text-xs text-zinc-200">{barA?.name}</span>
                  <span className="text-[10px] text-zinc-600">↔</span>
                  <span className="text-xs text-zinc-200">{barB?.name}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColor[c.status]}`}>
                  {statusLabel[c.status]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 ml-5">
                <span className="text-[10px] text-zinc-500">间距 {c.distance}m</span>
                <span className={`text-[10px] ${isCurrentFrame ? 'text-red-400 font-medium' : 'text-zinc-600'}`}>
                  帧{c.frameIndex} {isCurrentFrame ? '●' : ''}
                </span>
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}
