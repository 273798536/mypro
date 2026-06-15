import { useOceanStore } from "@/store/useOceanStore"
import { AlertTriangle, Copy } from "lucide-react"

export default function TidalTable() {
  const { tidalRecords, qualityIssues } = useOceanStore()

  const sorted = [...tidalRecords].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  )

  const getRowClass = (recordId: string) => {
    const issues = qualityIssues.filter(
      (i) => i.recordId === recordId && i.status !== "resolved"
    )
    if (issues.some((i) => i.type === "null_value")) return "bg-ocean-yellow/40"
    if (issues.some((i) => i.type === "duplicate")) return "bg-ocean-redLight/40"
    return ""
  }

  const hasNullIssue = (recordId: string) =>
    qualityIssues.some(
      (i) => i.recordId === recordId && i.type === "null_value" && i.status !== "resolved"
    )

  const hasDuplicateIssue = (recordId: string) =>
    qualityIssues.some(
      (i) => i.recordId === recordId && i.type === "duplicate" && i.status !== "resolved"
    )

  const hasMixedRemark = (recordId: string) =>
    qualityIssues.some(
      (i) => i.recordId === recordId && i.type === "mixed_remark" && i.status !== "resolved"
    )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-serif text-sm text-ocean-ink">水位数据表</h3>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-ocean-yellow/60" /> 空值
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-ocean-redLight/60" /> 重复
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ocean-surface text-xs text-gray-500">
              <th className="text-left px-4 py-2.5 font-medium">时间</th>
              <th className="text-left px-4 py-2.5 font-medium">潮位(m)</th>
              <th className="text-left px-4 py-2.5 font-medium">时区</th>
              <th className="text-left px-4 py-2.5 font-medium">来源</th>
              <th className="text-left px-4 py-2.5 font-medium">备注</th>
              <th className="text-left px-4 py-2.5 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.id}
                className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${getRowClass(r.id)}`}
              >
                <td className="px-4 py-2.5 font-mono text-xs">
                  {r.timestamp.slice(11, 16)}
                </td>
                <td className="px-4 py-2.5">
                  {r.tideLevel !== null ? (
                    <span className="font-mono">{r.tideLevel.toFixed(1)}</span>
                  ) : (
                    <span className="text-ocean-coral font-medium flex items-center gap-1">
                      <AlertTriangle size={12} /> 空
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {r.timezone}
                  {qualityIssues.some(
                    (i) =>
                      i.recordId === r.id &&
                      i.type === "timezone_error" &&
                      i.status !== "resolved"
                  ) && (
                    <span className="ml-1 text-ocean-coral text-[10px]">
                      ⚠
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      r.source === "manual"
                        ? "bg-ocean-light/15 text-ocean-mid"
                        : r.source === "import"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-purple-50 text-purple-600"
                    }`}
                  >
                    {r.source === "manual"
                      ? "手动"
                      : r.source === "import"
                      ? "导入"
                      : "补录"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[160px] truncate">
                  {r.remark}
                  {hasMixedRemark(r.id) && (
                    <Copy size={10} className="inline ml-1 text-ocean-coral" />
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {hasNullIssue(r.id) && (
                    <span className="text-[10px] bg-ocean-yellow text-ocean-yellowDark px-1.5 py-0.5 rounded">
                      空值
                    </span>
                  )}
                  {hasDuplicateIssue(r.id) && (
                    <span className="text-[10px] bg-ocean-redLight text-ocean-redDark px-1.5 py-0.5 rounded ml-1">
                      重复
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
