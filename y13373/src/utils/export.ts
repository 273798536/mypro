import type { QueueRecord } from "@/types"

export function exportToCSV(records: QueueRecord[]): void {
  const headers = [
    "任务ID", "任务名称", "类型", "状态", "污染标记",
    "GPU成本(元)", "耗时(秒)", "模型", "数据集",
    "失败日志摘要", "创建时间", "更新时间"
  ]
  const rows = records.map(r => [
    r.taskId,
    r.taskName,
    r.type === "failure" ? "失败" : "正常",
    r.status === "pending" ? "待复核" : r.status === "confirmed" ? "已处理" : "已撤回",
    r.isContaminated ? "是" : "否",
    r.gpuCost.toString(),
    r.duration.toString(),
    r.model,
    r.dataset,
    r.failureLog ? r.failureLog.substring(0, 100).replace(/"/g, '""') : "",
    r.createdAt,
    r.updatedAt,
  ])
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
  ].join("\n")
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `训练队列成本报告_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToJSON(records: QueueRecord[]): void {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `训练队列成本报告_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImportJSON(text: string): QueueRecord[] {
  const parsed = JSON.parse(text)
  const arr = Array.isArray(parsed) ? parsed : [parsed]
  return arr.map((item: Partial<QueueRecord>, i: number) => ({
    id: item.id || `import-${Date.now()}-${i}`,
    taskId: item.taskId || `T-IMPORT-${Date.now()}-${i}`,
    taskName: item.taskName || "导入任务",
    type: item.type || "failure",
    status: item.status || "pending",
    isContaminated: item.isContaminated || false,
    failureLog: item.failureLog || "",
    gpuCost: item.gpuCost || 0,
    duration: item.duration || 0,
    model: item.model || "",
    dataset: item.dataset || "",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    statusHistory: item.statusHistory || [],
  }))
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}时${m}分`
}

export function formatCost(cost: number): string {
  return `¥${cost.toFixed(1)}`
}
