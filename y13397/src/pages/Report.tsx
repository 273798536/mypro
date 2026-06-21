import { useNavigate } from "react-router-dom"
import { useStore } from "@/store/useStore"
import { FileText, Download, CheckCircle2, Clock, UserCheck, ChevronDown, ChevronUp } from "lucide-react"
import { statusConfig, recordTypeLabels } from "@/lib/constants"
import { useState } from "react"
import type { ReplayRecord } from "@/types"

export default function Report() {
  const navigate = useNavigate()
  const { generateReport } = useStore()
  const report = generateReport()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    processed: true,
    pending: true,
    override: true,
  })

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

  const generateMarkdown = () => {
    const lines: string[] = [
      "# 影子流量异常回放报告",
      "",
      `> 生成时间: ${report.generatedAt}`,
      "",
      "---",
      "",
    ]

    const appendSection = (title: string, emoji: string, items: ReplayRecord[]) => {
      lines.push(`## ${emoji} ${title}`, "")
      if (items.length === 0) {
        lines.push("*无记录*", "")
        return
      }
      items.forEach((item, idx) => {
        lines.push(`### ${idx + 1}. ${item.title}`, "")
        lines.push(`- **状态**: ${statusConfig[item.status].label}`)
        lines.push(`- **记录类型**: ${recordTypeLabels[item.recordType]}`)
        if (item.featureLateFlag) lines.push(`- **特征迟到**: ⚠️ 是`)
        lines.push(`- **创建时间**: ${item.createdAt}`)
        if (item.updatedAt !== item.createdAt) lines.push(`- **更新时间**: ${item.updatedAt}`)
        lines.push(`- **材料溯源}:`)
        item.materials.forEach((m) => {
          const typeLabel = m.type === "training_log" ? "日志" : m.type === "supplementary_note" ? "备注" : "口头"
          lines.push(`  - [${typeLabel}] ${m.description}${m.revised ? " **[口径变更]**" : ""}`)
          if (m.revised && m.revisedContent) {
            lines.push(`    - 变更时间: ${m.revisedAt}`)
            lines.push(`    - 变更内容: ${m.revisedContent}`)
          }
        })
        lines.push("")
      })
    }

    appendSection("已处理", "✅", report.processedItems)
    appendSection("待补材料", "⏳", report.pendingMaterialItems)
    appendSection("人工改判", "🔄", report.manualOverrideItems)

    lines.push("---", "", `*报告由影子流量异常回放系统自动生成*`)

    return lines.join("\n")
  }

  const handleExport = () => {
    const md = generateMarkdown()
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `影子流量异常回放报告_${report.generatedAt.replace(/[: ]/g, "-")}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sections = [
    {
      key: "processed",
      title: "已处理",
      icon: CheckCircle2,
      color: "text-status-processed",
      dotColor: "bg-status-processed",
      items: report.processedItems,
    },
    {
      key: "pending",
      title: "待补材料",
      icon: Clock,
      color: "text-status-pending",
      dotColor: "bg-status-pending",
      items: report.pendingMaterialItems,
    },
    {
      key: "override",
      title: "人工改判",
      icon: UserCheck,
      color: "text-status-override",
      dotColor: "bg-status-override",
      items: report.manualOverrideItems,
    },
  ]

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold text-surface-100">报告预览与导出</h2>
            </div>
            <p className="text-sm text-surface-500 ml-11">
              Markdown 报告实时生成，状态与接口查询一致 · 生成时间: {report.generatedAt}
            </p>
          </div>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-surface-950 text-sm font-medium hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            <Download className="w-4 h-4" />
            导出 Markdown
          </button>
        </div>

        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon
            const isExpanded = expanded[section.key]
            return (
              <div key={section.key} className="bg-surface-900/80 border border-surface-700/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggle(section.key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${section.dotColor}`} />
                    <Icon className={`w-4 h-4 ${section.color}`} />
                    <span className="text-sm font-medium text-surface-200">{section.title}</span>
                    <span className="text-xs text-surface-500 data-font">({section.items.length})</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-surface-500" /> : <ChevronDown className="w-4 h-4 text-surface-500" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {section.items.length === 0 ? (
                      <p className="text-xs text-surface-500 py-4 text-center">无记录</p>
                    ) : (
                      section.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-surface-800/40 rounded-lg p-4 border border-surface-700/30 cursor-pointer hover:border-amber-500/30 transition-colors"
                          onClick={() => navigate(`/compare/${item.id}`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm text-surface-200">{item.title}</h4>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusConfig[item.status].color}`}>
                              {statusConfig[item.status].label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700/50 text-surface-400">
                              {recordTypeLabels[item.recordType]}
                            </span>
                            {item.featureLateFlag && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-pending/15 text-status-pending">
                                特征迟到
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {item.materials.map((m, mi) => (
                              <div key={mi} className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] px-1 py-0.5 rounded ${
                                    m.type === "training_log"
                                      ? "bg-blue-500/10 text-blue-400/80"
                                      : m.type === "supplementary_note"
                                        ? "bg-violet-500/10 text-violet-400/80"
                                        : "bg-surface-600/20 text-surface-400"
                                  }`}
                                >
                                  {m.type === "training_log" ? "日志" : m.type === "supplementary_note" ? "备注" : "口头"}
                                </span>
                                <span className="text-xs text-surface-400">{m.description}</span>
                                {m.revised && (
                                  <span className="text-[10px] text-amber-400/80">[口径变更]</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-[10px] text-surface-500">
                            <span>创建: {item.createdAt}</span>
                            {item.updatedAt !== item.createdAt && <span>更新: {item.updatedAt}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
