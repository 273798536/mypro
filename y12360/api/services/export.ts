import type { CalculationRecord } from "../../shared/types.js"

export function generateJsonReport(record: CalculationRecord): string {
  return JSON.stringify({
    报告信息: {
      生成时间: new Date().toISOString(),
      记录ID: record.id,
      版本: record.version,
      状态: record.status,
      来源: record.source,
    },
    输入参数: {
      额定流量: { 值: record.ratedFlow, 单位: record.ratedFlowUnit },
      额定扬程: { 值: record.ratedHead, 单位: record.ratedHeadUnit },
      额定功率: { 值: record.ratedPower, 单位: record.ratedPowerUnit },
      额定转速: { 值: record.ratedSpeed, 单位: record.speedUnit },
      目标转速: { 值: record.targetSpeed, 单位: record.speedUnit },
    },
    计算结果: {
      目标流量: { 值: record.targetFlow, 单位: record.ratedFlowUnit },
      目标扬程: { 值: record.targetHead, 单位: record.ratedHeadUnit },
      目标功率: { 值: record.targetPower, 单位: record.ratedPowerUnit },
      流量比: record.flowRatio,
      扬程比: record.headRatio,
      功率比: record.powerRatio,
      效率估算: record.efficiencyEstimate,
    },
    校验警告: record.warnings.map(w => ({
      代码: w.code,
      消息: w.message,
      受影响字段: w.affectedFields,
      严重程度: w.severity,
    })),
    状态流转: record.statusHistory.map(h => ({
      操作人: h.operator,
      从: h.fromStatus || "无",
      到: h.toStatus,
      备注: h.comment || "",
      时间: h.createdAt,
    })),
    创建时间: record.createdAt,
    更新时间: record.updatedAt,
    备注: record.remark || "",
  }, null, 2)
}

export function generateCsvReport(records: CalculationRecord[]): string {
  const headers = [
    "记录ID", "来源", "版本", "状态",
    "额定流量", "流量单位", "额定扬程", "扬程单位", "额定功率", "功率单位",
    "额定转速(rpm)", "目标转速(rpm)",
    "目标流量", "目标扬程", "目标功率",
    "流量比", "扬程比", "功率比", "效率估算",
    "警告数量", "创建时间", "备注"
  ]

  const rows = records.map(r => [
    r.id, r.source, r.version, r.status,
    r.ratedFlow, r.ratedFlowUnit, r.ratedHead, r.ratedHeadUnit, r.ratedPower, r.ratedPowerUnit,
    r.ratedSpeed, r.targetSpeed,
    r.targetFlow ?? "", r.targetHead ?? "", r.targetPower ?? "",
    r.flowRatio ?? "", r.headRatio ?? "", r.powerRatio ?? "", r.efficiencyEstimate ?? "",
    r.warnings.length, r.createdAt, r.remark || ""
  ])

  const csvContent = [headers, ...rows].map(row =>
    row.map(cell => {
      const s = String(cell)
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }).join(",")
  ).join("\n")

  return "\uFEFF" + csvContent
}
