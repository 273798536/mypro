import { useReviewStore } from '@/store'
import { ArrowRight, User, Clock, FileText } from 'lucide-react'

export default function CoordChangeLog() {
  const { pointVersions, points, coordSystems } = useReviewStore()

  const getPointName = (pointId: string) =>
    points.find((p) => p.id === pointId)?.name ?? pointId

  const getCoordName = (coordSystemId: string) =>
    coordSystems.find((c) => c.id === coordSystemId)?.name ?? coordSystemId

  const grouped: Record<string, typeof pointVersions> = {}
  pointVersions.forEach((pv) => {
    if (!grouped[pv.pointId]) grouped[pv.pointId] = []
    grouped[pv.pointId].push(pv)
  })

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">坐标系变更记录</h3>
      {Object.entries(grouped).map(([pointId, versions]) => {
        const sorted = [...versions].sort(
          (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
        )
        return (
          <div key={pointId} className="bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-2 font-medium">
              点位: {getPointName(pointId)}
            </div>
            <div className="space-y-2">
              {sorted.map((pv, idx) => {
                const nextPv = sorted[idx + 1]
                return (
                  <div key={pv.id}>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-orange-900 text-orange-300 font-medium">
                        {getCoordName(pv.coordSystemId)}
                      </span>
                      {nextPv && (
                        <>
                          <ArrowRight size={14} className="text-slate-500" />
                          <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-medium">
                            {getCoordName(nextPv.coordSystemId)}
                          </span>
                        </>
                      )}
                      <span className="flex items-center gap-1 text-slate-500">
                        <User size={11} />
                        {pv.changedBy}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock size={11} />
                        {formatDate(pv.changedAt)}
                      </span>
                    </div>
                    <div className="flex items-start gap-1 mt-1 text-xs text-slate-400">
                      <FileText size={11} className="mt-0.5 shrink-0" />
                      <span>{pv.reason}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      {Object.keys(grouped).length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">暂无坐标系变更记录</p>
      )}
    </div>
  )
}
