import { useNavigate } from "react-router-dom"
import { Map, List, Upload } from "lucide-react"
import type { Workshop } from "@/types"

export interface WorkshopStats {
  total: number
  pending: number
  approved: number
  rejected: number
  resolved: number
  offlineAsset: number
  coordinateOffset: number
  lastInspectionTime: string | null
}

interface WorkshopCardProps {
  workshop: Workshop
  stats?: WorkshopStats
  onImport: () => void
}

const ACTIONS = [
  { icon: Map, label: "画布", path: (id: string) => `/canvas/${id}` },
  { icon: List, label: "缺陷", path: (id: string) => `/defects/${id}` },
] as const

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export default function WorkshopCard({ workshop, stats, onImport }: WorkshopCardProps) {
  const navigate = useNavigate()

  return (
    <div className="rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="p-4">
        <h3
          className="cursor-pointer text-lg font-bold text-iron transition-colors hover:text-warn"
          onClick={() => navigate(`/canvas/${workshop.id}`)}
        >
          {workshop.name}
        </h3>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
          <span>
            缺陷 <strong className="text-iron">{stats?.total ?? 0}</strong>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            {stats?.lastInspectionTime
              ? `最近巡检 ${formatTime(stats.lastInspectionTime)}`
              : "暂无巡检记录"}
          </span>
        </div>
        {(stats?.pending ?? 0) > 0 && (
          <span className="mt-2 inline-block rounded-full bg-warn/10 px-2.5 py-0.5 text-xs font-medium text-warn">
            有待确认缺陷
          </span>
        )}
      </div>
      <div className="flex border-t border-gray-100">
        {ACTIONS.map(({ icon: Icon, label, path }) => (
          <button
            key={label}
            onClick={() => navigate(path(workshop.id))}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-iron"
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        <button
          onClick={onImport}
          className="flex flex-1 items-center justify-center gap-1.5 border-l border-gray-100 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-warn"
        >
          <Upload size={15} />
          导入
        </button>
      </div>
    </div>
  )
}
