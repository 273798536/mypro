import type { Pipeline, Conflict } from "@/types"

export function generateReport(
  pipelines: Pipeline[],
  conflicts: Conflict[],
  coordinationRecords: { id: string; conflictId: string; action: string; handler: string; timestamp: string; result: string; pipelineChanges?: { pipelineId: string; field: string; oldValue: string; newValue: string }[] }[]
): string {
  const lines: string[] = []
  const now = new Date().toLocaleString("zh-CN")

  lines.push("=" .repeat(60))
  lines.push("城市地下管网剖切 — 冲突检测与协调报告")
  lines.push("=".repeat(60))
  lines.push(`生成时间: ${now}`)
  lines.push("")

  lines.push("-".repeat(40))
  lines.push("一、管线概况")
  lines.push("-".repeat(40))
  lines.push(`管线总数: ${pipelines.length}`)
  const byType = new Map<string, Pipeline[]>()
  pipelines.forEach((p) => {
    const list = byType.get(p.type) || []
    list.push(p)
    byType.set(p.type, list)
  })
  const typeLabels: Record<string, string> = { gas: "燃气", electric: "电力", stormwater: "雨水", watersupply: "给水", telecom: "通信" }
  byType.forEach((list, type) => {
    lines.push(`  ${typeLabels[type] || type}: ${list.length}条`)
  })
  lines.push("")

  lines.push("-".repeat(40))
  lines.push("二、冲突汇总")
  lines.push("-".repeat(40))
  lines.push(`冲突总数: ${conflicts.length}`)
  const critical = conflicts.filter((c) => c.severity === "critical").length
  const warning = conflicts.filter((c) => c.severity === "warning").length
  const info = conflicts.filter((c) => c.severity === "info").length
  lines.push(`  严重: ${critical}  警告: ${warning}  提示: ${info}`)
  lines.push("")

  conflicts.forEach((c, i) => {
    const severityLabels: Record<string, string> = { critical: "严重", warning: "警告", info: "提示" }
    const typeLabels2: Record<string, string> = { elevation_mismatch: "标高错配", outdated_drawing: "旧图未作废", pipeline_crossing: "管线交叉" }
    const statusLabels: Record<string, string> = { unresolved: "未解决", in_progress: "处理中", resolved: "已解决" }
    lines.push(`  [冲突 ${i + 1}] ${c.id}`)
    lines.push(`    类型: ${typeLabels2[c.type]}  严重度: ${severityLabels[c.severity]}  状态: ${statusLabels[c.status]}`)
    lines.push(`    描述: ${c.description}`)
    lines.push(`    涉及管线: ${c.involvedPipelines.join(", ")}`)
    if (c.elevationExpected != null) {
      lines.push(`    设计标高: ${c.elevationExpected}m  实际标高: ${c.elevationActual}m`)
    }
    lines.push("")
  })

  lines.push("-".repeat(40))
  lines.push("三、协调记录")
  lines.push("-".repeat(40))
  lines.push(`记录总数: ${coordinationRecords.length}`)
  lines.push("")

  coordinationRecords.forEach((r, i) => {
    lines.push(`  [记录 ${i + 1}] ${r.id}`)
    lines.push(`    关联冲突: ${r.conflictId}`)
    lines.push(`    处理动作: ${r.action}`)
    lines.push(`    处理人: ${r.handler}`)
    lines.push(`    时间: ${r.timestamp}`)
    lines.push(`    结果: ${r.result}`)
    if (r.pipelineChanges && r.pipelineChanges.length > 0) {
      lines.push("    数据变更:")
      r.pipelineChanges.forEach((ch) => {
        lines.push(`      管线${ch.pipelineId}.${ch.field}: ${ch.oldValue} → ${ch.newValue}`)
      })
    }
    lines.push("")
  })

  lines.push("-".repeat(40))
  lines.push("四、管线明细")
  lines.push("-".repeat(40))
  pipelines.forEach((p) => {
    const sourceLabels: Record<string, string> = { original: "原始材料", processed: "处理结果" }
    const riskLabels: Record<string, string> = { high: "高", medium: "中", low: "低" }
    const versionLabels: Record<string, string> = { current: "当前", superseded: "已取代", draft: "草稿" }
    lines.push(`  ${p.name} (${p.id})`)
    lines.push(`    类型: ${typeLabels[p.type]}  版本: ${p.version}(${versionLabels[p.versionStatus]})  风险: ${riskLabels[p.riskLevel]}`)
    lines.push(`    材质: ${p.material}  管径: ${p.diameter}m  数据来源: ${sourceLabels[p.dataSource]}`)
    lines.push(`    来源说明: ${p.sourceDescription}`)
    lines.push(`    最后更新: ${p.lastUpdated}`)
    lines.push("")
  })

  lines.push("=".repeat(60))
  lines.push("报告结束")
  lines.push("=".repeat(60))

  return lines.join("\n")
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function captureScreenshot(canvas: HTMLElement | null): Promise<string | null> {
  if (!canvas) return null
  try {
    const html2canvas = (await import("html2canvas")).default
    const result = await html2canvas(canvas, {
      backgroundColor: "#1a1d23",
      scale: 2,
    })
    return result.toDataURL("image/png")
  } catch {
    return null
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  a.click()
}
