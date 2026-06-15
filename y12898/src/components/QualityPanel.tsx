import { useEffect } from "react"
import { useOceanStore } from "@/store/useOceanStore"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"
import type { QualityIssue, IssueSeverity } from "@/types"

const severityConfig: Record<IssueSeverity, { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = {
  critical: { icon: AlertTriangle, color: "text-ocean-coral", bg: "bg-ocean-coral/10", label: "严重" },
  warning: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50", label: "警告" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-50", label: "提示" },
}

const typeLabels: Record<string, string> = {
  null_value: "空值",
  duplicate: "重复",
  timezone_error: "时区错",
  mixed_remark: "备注混写",
}

export default function QualityPanel() {
  const { qualityIssues, tidalRecords, selectedIssueId, setSelectedIssueId, confirmIssue, resolveIssue, refreshQualityIssues } =
    useOceanStore()

  useEffect(() => {
    if (tidalRecords.length > 0 && qualityIssues.length === 0) {
      refreshQualityIssues()
    }
  }, [tidalRecords])

  const grouped = {
    critical: qualityIssues.filter((i) => i.severity === "critical" && i.status !== "resolved"),
    warning: qualityIssues.filter((i) => i.severity === "warning" && i.status !== "resolved"),
    info: qualityIssues.filter((i) => i.severity === "info" && i.status !== "resolved"),
  }

  const resolvedCount = qualityIssues.filter((i) => i.status === "resolved").length

  const getRecord = (recordId: string) => tidalRecords.find((r) => r.id === recordId)

  const renderIssue = (issue: QualityIssue) => {
    const config = severityConfig[issue.severity]
    const Icon = config.icon
    const isSelected = selectedIssueId === issue.id
    const record = getRecord(issue.recordId)

    return (
      <div
        key={issue.id}
        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
          isSelected
            ? "border-ocean-light bg-ocean-light/5 shadow-sm"
            : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
        }`}
        onClick={() => setSelectedIssueId(isSelected ? null : issue.id)}
      >
        <div className="flex items-start gap-2.5">
          <div className={`mt-0.5 ${config.color}`}>
            <Icon size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${config.bg} ${config.color}`}>
                {config.label}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                {typeLabels[issue.type]}
              </span>
              {issue.status === "confirmed" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ocean-greenLight text-ocean-greenDark">
                  已确认
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{issue.description}</p>

            {isSelected && record && (
              <div className="mt-3 pt-2 border-t border-gray-100 space-y-2">
                <div className="text-xs text-gray-400">
                  原始数据: 潮位={record.tideLevel ?? "空"} | 时区={record.timezone} | 备注={record.remark}
                </div>
                <div className="flex gap-2">
                  {issue.status === "pending" && (
                    <button
                      className="text-[11px] bg-ocean-light/15 text-ocean-mid px-3 py-1 rounded-full hover:bg-ocean-light/25 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        confirmIssue(issue.id)
                      }}
                    >
                      确认
                    </button>
                  )}
                  <button
                    className="text-[11px] bg-ocean-green/15 text-ocean-greenDark px-3 py-1 rounded-full hover:bg-ocean-green/25 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      resolveIssue(issue.id)
                    }}
                  >
                    标记已解决
                  </button>
                </div>
              </div>
            )}
          </div>
          <ChevronRight
            size={14}
            className={`text-gray-300 transition-transform ${isSelected ? "rotate-90" : ""}`}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-serif text-sm text-ocean-ink">数据质量检测</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400">
            {qualityIssues.length} 项问题
          </span>
          {resolvedCount > 0 && (
            <span className="flex items-center gap-1 text-ocean-green">
              <CheckCircle2 size={12} />
              {resolvedCount} 已解决
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-[520px] overflow-y-auto">
        {grouped.critical.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-ocean-coral">严重问题</div>
            {grouped.critical.map(renderIssue)}
          </div>
        )}

        {grouped.warning.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-amber-500">警告</div>
            {grouped.warning.map(renderIssue)}
          </div>
        )}

        {grouped.info.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-blue-500">提示</div>
            {grouped.info.map(renderIssue)}
          </div>
        )}

        {qualityIssues.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            <CheckCircle2 size={24} className="mx-auto mb-2 text-ocean-green" />
            所有数据质量检查通过
          </div>
        )}
      </div>
    </div>
  )
}
