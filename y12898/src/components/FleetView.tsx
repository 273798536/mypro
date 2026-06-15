import { useOceanStore } from "@/store/useOceanStore"
import { Shield, Droplets, CheckCircle2, Clock } from "lucide-react"

export default function FleetView() {
  const {
    riskNotices,
    waterQualityRecords,
    duplicateReports,
    tidalRecords,
    qualityIssues,
    corrections,
    reviewNotes,
  } = useOceanStore()

  const unresolvedIssues = qualityIssues.filter((i) => i.status !== "resolved")
  const approvedNotes = reviewNotes.filter((n) => n.status === "approved")
  const processedDuplicates = duplicateReports.filter((d) => d.status !== "pending")

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-ocean-deep/10 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-ocean-deep rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-ocean-light" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-ocean-ink">船队复核报告</h4>
            <p className="text-xs text-gray-400">
              {new Date().toLocaleDateString("zh-CN")} · 材料编号 OCEAN-{Date.now().toString(36).slice(-6).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h5 className="text-xs font-medium text-ocean-coral mb-2 flex items-center gap-1.5">
              <Shield size={12} />
              风险通报 ({riskNotices.length})
            </h5>
            {riskNotices.map((n) => (
              <div key={n.id} className="flex items-start gap-2 ml-5 mb-2">
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    n.level === "red" ? "bg-red-500" : n.level === "orange" ? "bg-ocean-coral" : "bg-amber-400"
                  }`}
                />
                <div>
                  <span className="text-sm text-ocean-ink font-medium">{n.title}: </span>
                  <span className="text-sm text-gray-600">{n.description}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3">
            <h5 className="text-xs font-medium text-ocean-mid mb-2 flex items-center gap-1.5">
              <Droplets size={12} />
              水质概况 ({waterQualityRecords.length} 条)
            </h5>
            <div className="ml-5 text-sm text-gray-600 space-y-1">
              {waterQualityRecords.map((wq) => (
                <div key={wq.id} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-400">
                    {wq.timestamp.slice(11, 16)}
                  </span>
                  <span>
                    溶氧 {wq.dissolvedOxygen?.toFixed(1) ?? "—"}mg/L
                  </span>
                  <span>
                    盐度 {wq.salinity?.toFixed(1) ?? "—"}‰
                  </span>
                  <span>
                    水温 {wq.temperature?.toFixed(1) ?? "—"}°C
                  </span>
                  {wq.dissolvedOxygen !== null && wq.dissolvedOxygen < 6 && (
                    <span className="text-ocean-coral text-xs">⚠ 偏低</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <h5 className="text-xs font-medium text-amber-500 mb-2 flex items-center gap-1.5">
              <Clock size={12} />
              复核状态
            </h5>
            <div className="ml-5 text-sm space-y-1">
              <div className="flex items-center gap-2">
                {unresolvedIssues.length === 0 ? (
                  <CheckCircle2 size={14} className="text-ocean-green" />
                ) : (
                  <Clock size={14} className="text-amber-500" />
                )}
                <span className="text-gray-700">
                  数据质量: {unresolvedIssues.length === 0 ? "全部通过" : `${unresolvedIssues.length} 项待处理`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className={processedDuplicates.length === duplicateReports.length ? "text-ocean-green" : "text-amber-500"} />
                <span className="text-gray-700">
                  重复记录: {processedDuplicates.length}/{duplicateReports.length} 已处理
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-ocean-green" />
                <span className="text-gray-700">
                  潮汐记录: {tidalRecords.length} 条
                </span>
              </div>
            </div>
          </div>

          {approvedNotes.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <h5 className="text-xs font-medium text-ocean-greenDark mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                场长备注 (已审核)
              </h5>
              <div className="ml-5 space-y-1">
                {approvedNotes.map((note) => (
                  <div key={note.id} className="text-sm text-gray-600">
                    • {note.content}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
