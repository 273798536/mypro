import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { useWorkshopStore } from "@/store/useWorkshopStore"
import StatsBar from "./layer-manager/StatsBar"
import WorkshopCard from "./layer-manager/WorkshopCard"
import ImportDialog from "./layer-manager/ImportDialog"
import CreateDialog from "./layer-manager/CreateDialog"
import type { Defect } from "@/types"
import type { WorkshopStats } from "./layer-manager/WorkshopCard"

const EMPTY_STATS: WorkshopStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  resolved: 0,
  offlineAsset: 0,
  coordinateOffset: 0,
  lastInspectionTime: null,
}

function computeStats(defects: Defect[]): WorkshopStats {
  const lastInspectionTime =
    defects.length > 0
      ? defects.reduce((latest, d) => (d.updatedAt > latest ? d.updatedAt : latest), defects[0].updatedAt)
      : null
  return {
    total: defects.length,
    pending: defects.filter((d) => d.status === "pending").length,
    approved: defects.filter((d) => d.status === "approved").length,
    rejected: defects.filter((d) => d.status === "rejected").length,
    resolved: defects.filter((d) => d.status === "resolved").length,
    offlineAsset: defects.filter((d) => d.isOfflineAsset).length,
    coordinateOffset: defects.filter((d) => d.coordinateOffset).length,
    lastInspectionTime,
  }
}

function sumStats(all: WorkshopStats[]) {
  return all.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      pending: acc.pending + s.pending,
      approved: acc.approved + s.approved,
      rejected: acc.rejected + s.rejected,
      resolved: acc.resolved + s.resolved,
      offlineAsset: acc.offlineAsset + s.offlineAsset,
      coordinateOffset: acc.coordinateOffset + s.coordinateOffset,
    }),
    EMPTY_STATS
  )
}

export default function LayerManager() {
  const { workshops, fetchWorkshops, createWorkshop } = useWorkshopStore()
  const [statsMap, setStatsMap] = useState<Record<string, WorkshopStats>>({})
  const [importWorkshopId, setImportWorkshopId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchWorkshops()
  }, [fetchWorkshops])

  useEffect(() => {
    if (workshops.length === 0) return
    let cancelled = false
    const loadStats = async () => {
      const map: Record<string, WorkshopStats> = {}
      for (const ws of workshops) {
        try {
          const res = await fetch(`/api/workshops/${ws.id}/defects`)
          const json = await res.json()
          map[ws.id] = computeStats(json.data ?? [])
        } catch {
          map[ws.id] = EMPTY_STATS
        }
      }
      if (!cancelled) setStatsMap(map)
    }
    loadStats()
    return () => {
      cancelled = true
    }
  }, [workshops])

  const aggregate = sumStats(Object.values(statsMap))

  const handleCreate = async (name: string) => {
    await createWorkshop(name)
    setShowCreate(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-iron">图层管理</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-md bg-warn px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-warn/90"
        >
          <Plus size={16} />
          新建车间
        </button>
      </div>

      <StatsBar {...aggregate} />

      {workshops.length === 0 ? (
        <div className="py-20 text-center text-gray-400">暂无车间数据</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {workshops.map((ws) => (
            <WorkshopCard
              key={ws.id}
              workshop={ws}
              stats={statsMap[ws.id]}
              onImport={() => setImportWorkshopId(ws.id)}
            />
          ))}
        </div>
      )}

      {importWorkshopId && (
        <ImportDialog workshopId={importWorkshopId} onClose={() => setImportWorkshopId(null)} />
      )}
      {showCreate && <CreateDialog onConfirm={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
