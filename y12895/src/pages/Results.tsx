import { useState } from "react"
import { useStore } from "@/store/useStore"
import StatusBadge from "@/components/StatusBadge"
import type { ResultStatus, ResultItem } from "@/types"
import {
  ClipboardCheck,
  Navigation,
  Droplets,
  FlaskConical,
  Bug,
  Camera,
  CloudSun,
  Waves,
  ShieldCheck,
  PenLine,
  CheckCircle,
  Clock,
  RotateCcw,
  Info,
  Link2,
  Anchor,
  Ship,
  AlertCircle,
  UserCheck,
} from "lucide-react"

type FilterTab = "全部" | ResultStatus

const categoryIcons: Record<string, typeof Navigation> = {
  "轨迹漂移": Navigation,
  "水质-溶解氧": Droplets,
  "水质-重金属": FlaskConical,
  "水质-大肠杆菌": Bug,
  "巡检照片": Camera,
  "气象条件": CloudSun,
  "潮汐": Waves,
  "禁航区": ShieldCheck,
  "人工修正": PenLine,
}

const statusCounts = (items: ResultItem[]) => ({
  "可用": items.filter((r) => r.status === "可用").length,
  "暂缓": items.filter((r) => r.status === "暂缓").length,
  "重新采集": items.filter((r) => r.status === "重新采集").length,
})

const summaryCards: {
  status: ResultStatus
  icon: typeof CheckCircle
  bgClass: string
  iconColor: string
  countColor: string
  borderColor: string
  subtitle: string
}[] = [
  {
    status: "可用",
    icon: CheckCircle,
    bgClass: "bg-reef/10",
    iconColor: "text-reef",
    countColor: "text-reef-light",
    borderColor: "border-reef/30",
    subtitle: "可直接使用",
  },
  {
    status: "暂缓",
    icon: Clock,
    bgClass: "bg-amber/10",
    iconColor: "text-amber",
    countColor: "text-amber-light",
    borderColor: "border-amber/30",
    subtitle: "需等待复测或调度员复核",
  },
  {
    status: "重新采集",
    icon: RotateCcw,
    bgClass: "bg-coral/10",
    iconColor: "text-coral",
    countColor: "text-coral-light",
    borderColor: "border-coral/30",
    subtitle: "需重新采样或采集",
  },
]

const tabs: FilterTab[] = ["全部", "可用", "暂缓", "重新采集"]

const actionGuide: Record<ResultStatus, { title: string; desc: string; action: string; icon: typeof Ship }> = {
  "可用": {
    title: "可直接使用",
    desc: "数据完整、复核通过，可直接用于结算",
    action: "正常走结算流程",
    icon: Ship,
  },
  "暂缓": {
    title: "需调度员复核",
    desc: "数据存在疑问，等待复测或人工确认",
    action: "联系港口调度员确认",
    icon: UserCheck,
  },
  "重新采集": {
    title: "数据不可用",
    desc: "数据异常或超标，需重新采集后再结算",
    action: "配合重新采集检测",
    icon: AlertCircle,
  },
}

export default function Results() {
  const [filter, setFilter] = useState<FilterTab>("全部")
  const results = useStore((s) => s.results)
  const selectedBatchId = useStore((s) => s.selectedBatchId)
  const batches = useStore((s) => s.batches)

  const currentBatch = batches.find((b) => b.id === selectedBatchId)
  const batchResults = results.filter((r) => r.batchId === selectedBatchId)
  const counts = statusCounts(batchResults)

  const filtered =
    filter === "全部" ? batchResults : batchResults.filter((r) => r.status === filter)

  const canSettleDirectly = counts["暂缓"] === 0 && counts["重新采集"] === 0

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {currentBatch && (
        <div className={`card-dark flex items-center gap-4 ${
          canSettleDirectly ? "border-reef/30" : "border-amber/30"
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            canSettleDirectly ? "bg-reef/15" : "bg-amber/15"
          }`}>
            <Anchor className={`w-6 h-6 ${canSettleDirectly ? "text-reef" : "text-amber"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-100 font-bold text-lg">
              {currentBatch.vesselName} · {selectedBatchId}
            </p>
            <p className="text-slate-400 text-sm mt-0.5">
              {currentBatch.portName} · 结算结果说明
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">共 {batchResults.length} 项结果</div>
            <div className={`data-mono text-xl font-bold ${
              canSettleDirectly ? "text-reef-light" : "text-amber-light"
            }`}>
              {canSettleDirectly ? "可直接结算" : "需复核"}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="section-title">
          <ClipboardCheck className="w-5 h-5 text-ice" />
          结果说明
        </div>
        <div className="text-xs text-slate-500">
          船队视角：绿色直接用 · 黄色找调度 · 红色重采集
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          const count = counts[card.status]
          const guide = actionGuide[card.status]
          const GuideIcon = guide.icon
          return (
            <div
              key={card.status}
              className={`${card.bgClass} border ${card.borderColor} rounded-xl p-4`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`${card.bgClass} border ${card.borderColor} rounded-lg p-2.5`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${card.countColor}`}>{count} 条</div>
                  <div className="text-xs text-slate-400">{card.status}</div>
                </div>
              </div>
              <div className="border-t border-ocean-700/30 pt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <GuideIcon className={`w-3.5 h-3.5 ${card.iconColor} shrink-0 mt-0.5`} />
                  <div>
                    <div className={`text-xs font-medium ${card.iconColor}`}>{guide.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{guide.desc}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 bg-ocean-950/50 rounded px-2 py-1">
                  → {guide.action}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-1 bg-ocean-900 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const isActive = filter === tab
          const tabCount = tab === "全部" ? batchResults.length : counts[tab as ResultStatus]
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-ocean-700 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
              <span className="ml-1.5 text-xs opacity-70">{tabCount}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {filtered.map((item) => {
          const CategoryIcon = categoryIcons[item.category] ?? ClipboardCheck
          const guide = actionGuide[item.status]
          const GuideIcon = guide.icon
          return (
            <div key={item.id} className="card-dark hover:border-ice/20 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-ocean-800 flex items-center justify-center flex-shrink-0">
                    <CategoryIcon className="w-4 h-4 text-ice" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-slate-100">{item.category}</div>
                      <span className="text-[10px] text-slate-600 font-mono">{item.id}</span>
                    </div>
                    <div className="text-sm text-slate-300 mt-1 leading-relaxed">{item.description}</div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge status={item.status} />
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 bg-ocean-950/80 rounded-lg px-3 py-2">
                <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs text-slate-400 leading-relaxed">{item.statusReason}</span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link2 className="w-3 h-3 text-slate-600 flex-shrink-0" />
                  {item.relatedDataIds.map((rid) => (
                    <span
                      key={rid}
                      className="text-[11px] font-mono text-slate-500 bg-ocean-800/60 px-1.5 py-0.5 rounded"
                    >
                      {rid}
                    </span>
                  ))}
                </div>
                <div className={`flex items-center gap-1.5 text-[11px] ${
                  item.status === "可用" ? "text-reef-light" :
                  item.status === "暂缓" ? "text-amber-light" : "text-coral-light"
                }`}>
                  <GuideIcon className="w-3 h-3 flex-shrink-0" />
                  <span>{guide.action}</span>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="card-dark text-center py-12 text-slate-500 text-sm">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>当前筛选条件下无结果</p>
          </div>
        )}
      </div>
    </div>
  )
}
