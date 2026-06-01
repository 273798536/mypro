import { useState } from "react"
import { FileText, Download, ChevronDown, ChevronUp, Clock, AlertTriangle } from "lucide-react"
import { useAuditStore } from "@/store/useAuditStore"
import { generateJSONReport, generateHTMLReport, downloadFile } from "@/utils/reportGenerator"
import type { AuditReport } from "@/types"

type ExportFormat = "json" | "html"

export default function Report() {
  const { reports, versions, generateReport } = useAuditStore()
  const [format, setFormat] = useState<ExportFormat>("json")
  const [lastGenerated, setLastGenerated] = useState<AuditReport | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleGenerate = () => {
    const report = generateReport()
    setLastGenerated(report)
  }

  const handleExport = () => {
    const target = lastGenerated || reports[reports.length - 1]
    if (!target) return

    if (format === "json") {
      const content = generateJSONReport(target)
      downloadFile(content, `audit_report_${target.id}.json`, "application/json")
    } else {
      const content = generateHTMLReport(target)
      downloadFile(content, `audit_report_${target.id}.html`, "text/html")
    }
  }

  const hasVersionMismatch = (r: AuditReport) => {
    const trainingVer = versions.filter((v) => v.source === "training").pop()?.version
    const featureVer = versions.filter((v) => v.source === "feature").pop()?.version
    const groupVer = versions.filter((v) => v.source === "group").pop()?.version
    return (
      r.trainingVersion !== trainingVer ||
      r.featureVersion !== featureVer ||
      r.groupVersion !== groupVer
    )
  }

  const hasLateArrival = (r: AuditReport) => {
    const groupVer = versions.find((v) => v.source === "group" && v.version === r.groupVersion)
    return groupVer?.isLate ?? false
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e4e4e7] p-6 space-y-8">
      <section>
        <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          报告生成
        </h2>

        <div className="bg-[#1a1a2e] rounded-lg p-5 space-y-4">
          <button
            onClick={handleGenerate}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
          >
            生成报告
          </button>

          {lastGenerated && (
            <div className="border border-zinc-700/50 rounded-lg p-4 bg-[#0f0f1a] space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-400">报告ID：</span>
                <span className="text-cyan-400 font-mono">{lastGenerated.id}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-400">创建时间：</span>
                <span>{new Date(lastGenerated.createdAt).toLocaleString("zh-CN")}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-zinc-400">版本信息：</span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                  训练 {lastGenerated.trainingVersion}
                </span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                  特征 {lastGenerated.featureVersion}
                </span>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                  分组 {lastGenerated.groupVersion}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="json">JSON</option>
              <option value="html">HTML</option>
            </select>
            <button
              onClick={handleExport}
              disabled={!lastGenerated && reports.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-semibold rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-cyan-400 mb-4">版本对应明细</h2>
        {reports.length === 0 ? (
          <p className="text-zinc-500">暂无报告</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a1a2e]">
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">训练样本版本</th>
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">特征列表版本</th>
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">客户分组版本</th>
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">报告ID</th>
                  <th className="px-4 py-2 text-left text-zinc-400 font-medium">生成时间</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const mismatch = hasVersionMismatch(r)
                  const late = hasLateArrival(r)
                  return (
                    <tr
                      key={r.id}
                      className={`border-t border-zinc-800/50 hover:bg-zinc-800/20 ${
                        mismatch ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <td className="px-4 py-2">
                        <span className={mismatch ? "text-amber-400 font-medium" : "text-zinc-300"}>
                          {r.trainingVersion}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={mismatch ? "text-amber-400 font-medium" : "text-zinc-300"}>
                          {r.featureVersion}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={late ? "text-red-400 font-medium" : "text-zinc-300"}>
                            {r.groupVersion}
                          </span>
                          {late && (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              延迟到达
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-cyan-400 font-mono text-xs">{r.id}</td>
                      <td className="px-4 py-2 text-zinc-300 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-300 mb-4">版本追溯</h2>
        {reports.length === 0 ? (
          <p className="text-zinc-500">暂无报告</p>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-zinc-700" />
            {[...reports].reverse().map((r) => {
              const isExpanded = expandedId === r.id
              return (
                <div key={r.id} className="relative mb-6">
                  <div className="absolute -left-5 top-1 w-4 h-4 rounded-full bg-cyan-500 border-2 border-[#0f0f1a] z-10" />
                  <div
                    className="bg-[#1a1a2e] rounded-lg border border-zinc-700/50 overflow-hidden cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-cyan-400 font-mono text-sm">{r.id}</span>
                        <span className="text-zinc-400 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(r.createdAt).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-zinc-400">
                          {r.featureImportance.length} 特征 · {r.leakageFeatures.length} 泄漏 · {r.conflicts.length} 冲突
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-zinc-700/50 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-zinc-500">训练样本版本：</span>
                            <span className="text-blue-400">{r.trainingVersion}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">特征列表版本：</span>
                            <span className="text-amber-400">{r.featureVersion}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">客户分组版本：</span>
                            <span className="text-green-400">{r.groupVersion}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">特征总数：</span>
                            <span>{r.featureImportance.length}</span>
                          </div>
                        </div>

                        {r.leakageFeatures.length > 0 && (
                          <div>
                            <p className="text-red-400 text-sm font-medium mb-1">泄漏特征</p>
                            <div className="flex flex-wrap gap-2">
                              {r.leakageFeatures.map((f) => (
                                <span
                                  key={f.name}
                                  className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs"
                                >
                                  {f.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {r.sparseGroups.length > 0 && (
                          <div>
                            <p className="text-amber-400 text-sm font-medium mb-1">稀疏分组</p>
                            <div className="flex flex-wrap gap-2">
                              {r.sparseGroups.map((g) => (
                                <span
                                  key={g.groupId}
                                  className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs"
                                >
                                  {g.groupName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {r.conflicts.length > 0 && (
                          <div>
                            <p className="text-zinc-400 text-sm font-medium mb-1">冲突记录</p>
                            <ul className="space-y-1">
                              {r.conflicts.map((c) => (
                                <li key={c.id} className="text-xs text-zinc-400">
                                  <span
                                    className={
                                      c.severity === "high"
                                        ? "text-red-400"
                                        : c.severity === "medium"
                                        ? "text-amber-400"
                                        : "text-cyan-400"
                                    }
                                  >
                                    [{c.severity}]
                                  </span>{" "}
                                  {c.description}
                                  {c.resolution ? (
                                    <span className="text-green-400 ml-1">- {c.resolution}</span>
                                  ) : (
                                    <span className="text-amber-400 ml-1">- 待处理</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
