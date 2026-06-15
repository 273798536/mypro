import { useStore } from "@/store/useStore"
import { Droplets, FileText, Link2, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react"
import type { WaterQualityAlert } from "@/types"

const levelConfig: Record<
  WaterQualityAlert["level"],
  { label: string; borderClass: string; badgeClass: string; icon: React.ReactNode; bgGlow: string }
> = {
  normal: {
    label: "正常",
    borderClass: "border-l-4 border-reef",
    badgeClass: "bg-reef/15 text-reef-light border border-reef/30",
    icon: <CheckCircle className="w-4 h-4 text-reef" />,
    bgGlow: "shadow-reef/5",
  },
  warning: {
    label: "预警",
    borderClass: "border-l-4 border-amber",
    badgeClass: "bg-amber/15 text-amber-light border border-amber/30",
    icon: <AlertTriangle className="w-4 h-4 text-amber" />,
    bgGlow: "shadow-amber/5",
  },
  critical: {
    label: "严重",
    borderClass: "border-l-4 border-coral",
    badgeClass: "bg-coral/15 text-coral-light border border-coral/30",
    icon: <XCircle className="w-4 h-4 text-coral" />,
    bgGlow: "shadow-coral/5",
  },
}

export default function WaterQuality() {
  const waterQualityAlerts = useStore((s) => s.waterQualityAlerts)
  const selectedBatchId = useStore((s) => s.selectedBatchId)

  const alerts = waterQualityAlerts.filter((a) => a.batchId === selectedBatchId)

  const normalCount = alerts.filter((a) => a.level === "normal").length
  const warningCount = alerts.filter((a) => a.level === "warning").length
  const criticalCount = alerts.filter((a) => a.level === "critical").length

  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, normal: 2 }
    return order[a.level] - order[b.level]
  })

  return (
    <div className="space-y-6">
      <div className="section-title">
        <Droplets className="w-5 h-5 text-ice" />
        水质预警
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card-dark flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-reef/15 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-reef" />
          </div>
          <div>
            <div className="text-xs text-slate-400">正常</div>
            <div className="data-mono text-xl font-bold">{normalCount}</div>
          </div>
        </div>
        <div className="card-dark flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber/15 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber" />
          </div>
          <div>
            <div className="text-xs text-slate-400">预警</div>
            <div className="data-mono text-xl font-bold">{warningCount}</div>
          </div>
        </div>
        <div className="card-dark flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-coral/15 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-coral" />
          </div>
          <div>
            <div className="text-xs text-slate-400">严重</div>
            <div className="data-mono text-xl font-bold">{criticalCount}</div>
          </div>
        </div>
      </div>

      {sortedAlerts.length === 0 ? (
        <div className="card-dark text-center py-12 text-slate-400">
          <Droplets className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>当前批次暂无水质预警数据</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAlerts.map((alert) => {
            const config = levelConfig[alert.level]
            return (
              <div
                key={alert.id}
                className={`card-dark ${config.borderClass} shadow-lg ${config.bgGlow}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}
                    >
                      {config.label}
                    </span>
                    <span className="text-xs text-slate-500 data-mono">{alert.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="data-mono">{alert.detectedAt}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-sm text-slate-200 leading-relaxed">{alert.conclusion}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-ocean-700/50">
                  <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    来源材料
                  </div>
                  <div className="bg-ocean-950/60 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5 text-ice/60 shrink-0" />
                      <span className="text-sm text-slate-200">{alert.sourceMaterial.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-400">
                        类型：<span className="text-slate-300">{alert.sourceMaterial.type}</span>
                      </span>
                      <span className="text-slate-400">
                        行号引用：
                        <span className="data-mono font-semibold text-ice">{alert.sourceMaterial.lineReference}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
