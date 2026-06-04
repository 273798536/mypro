import { AlertTriangle, Compass } from "lucide-react"

interface StatsBarProps {
  total: number
  pending: number
  approved: number
  rejected: number
  resolved: number
  offlineAsset: number
  coordinateOffset: number
}

const ITEMS: { key: keyof StatsBarProps; label: string; color: string }[] = [
  { key: "total", label: "总缺陷数", color: "text-iron" },
  { key: "pending", label: "待确认", color: "text-warn" },
  { key: "approved", label: "已通过", color: "text-pass" },
  { key: "rejected", label: "已驳回", color: "text-danger" },
  { key: "resolved", label: "已处理", color: "text-muted" },
]

export default function StatsBar(props: StatsBarProps) {
  return (
    <div className="flex items-center gap-6 rounded-lg bg-white px-5 py-3 shadow-sm">
      {ITEMS.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{item.label}</span>
          <span className={`text-lg font-bold ${item.color}`}>{props[item.key]}</span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-3">
        {props.offlineAsset > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">
            <AlertTriangle size={12} />
            离线素材缺失 {props.offlineAsset}
          </span>
        )}
        {props.coordinateOffset > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">
            <Compass size={12} />
            坐标偏移 {props.coordinateOffset}
          </span>
        )}
      </div>
    </div>
  )
}
