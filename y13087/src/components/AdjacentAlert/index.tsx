import { AlertTriangle, Link } from 'lucide-react'
import { useReviewStore } from '@/store/useReviewStore'
import { cn } from '@/lib/utils'

export function AdjacentAlert() {
  const adjacentPairs = useReviewStore((s) => s.adjacentPairs)
  const lightPoints = useReviewStore((s) => s.lightPoints)
  const setHoveredAdjacentPairId = useReviewStore((s) => s.setHoveredAdjacentPairId)
  const selectLightPoint = useReviewStore((s) => s.selectLightPoint)

  const unresolvedPairs = adjacentPairs.filter((ap) => !ap.isResolved)

  if (unresolvedPairs.length === 0) return null

  const getPointName = (id: string) => {
    return lightPoints.find((lp) => lp.id === id)?.name || id
  }

  const handlePairHover = (id: string | null) => {
    setHoveredAdjacentPairId(id)
  }

  const handlePairClick = (pointAId: string) => {
    selectLightPoint(pointAId)
  }

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
      <div
        className={cn(
          'rounded-xl border shadow-xl p-4 backdrop-blur-md',
          'bg-gradient-to-r from-red-950/80 to-red-900/60 border-red-500/40'
        )}
        style={{
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-red-400" />
          <span className="text-sm font-semibold text-red-300">相邻点位异常专区</span>
          <span className="text-xs text-red-400/70">
            ({unresolvedPairs.length} 条待处理)
          </span>
        </div>

        <div className="space-y-2 min-w-80">
          {unresolvedPairs.map((pair) => (
            <div
              key={pair.id}
              onMouseEnter={() => handlePairHover(pair.id)}
              onMouseLeave={() => handlePairHover(null)}
              onClick={() => handlePairClick(pair.pointAId)}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition-all duration-200',
                'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Link size={14} className="text-red-400" />
                <span className="text-sm font-medium text-red-200">
                  {getPointName(pair.pointAId)} ↔ {getPointName(pair.pointBId)}
                </span>
              </div>
              <p className="text-xs text-red-300/70 ml-5">{pair.description}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-red-400/50 mt-3 text-center">
          悬浮查看 3D 联动 · 点击定位
        </p>
      </div>
    </div>
  )
}
