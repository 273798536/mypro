import type { AuditReport, FeatureEntry, CustomerGroup, ConflictRecord } from "@/types"

export function generateJSONReport(report: AuditReport): string {
  return JSON.stringify(report, null, 2)
}

export function generateHTMLReport(report: AuditReport): string {
  const formatTime = (ts: number) => new Date(ts).toLocaleString("zh-CN")

  const leakageRows = report.leakageFeatures
    .map(
      (f) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${f.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${(f.importance * 100).toFixed(2)}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;color:#ef4444;">${f.leakageReason || "疑似泄漏"}</td>
      </tr>`
    )
    .join("")

  const sparseRows = report.sparseGroups
    .map(
      (g) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${g.groupName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${g.sampleCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${Object.values(g.featureCoverage).filter((c) => c < 0.5).length} 个特征覆盖率 &lt;50%</td>
      </tr>`
    )
    .join("")

  const conflictRows = report.conflicts
    .map(
      (c) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${c.type}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;color:${c.severity === "high" ? "#ef4444" : c.severity === "medium" ? "#f59e0b" : "#06b6d4"};">${c.severity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${c.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${c.resolution || "待处理"}</td>
      </tr>`
    )
    .join("")

  const topFeatures = report.featureImportance.slice(0, 20)
  const featureRows = topFeatures
    .map(
      (f, i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${i + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;${f.isLeakage ? "color:#ef4444;font-weight:bold;" : ""}">${f.name}${f.isLeakage ? " ⚠" : ""}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${(f.importance * 100).toFixed(2)}%</td>
      </tr>`
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>随机森林特征审计报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f0f1a; color: #e4e4e7; margin: 0; padding: 40px; }
    h1 { color: #f59e0b; font-size: 24px; margin-bottom: 8px; }
    h2 { color: #a1a1aa; font-size: 18px; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid #2a2a3e; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 8px; overflow: hidden; }
    th { background: #252540; padding: 10px 12px; text-align: left; color: #a1a1aa; font-weight: 600; font-size: 13px; }
    .meta { color: #71717a; font-size: 13px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; }
    .badge-training { background: #1e3a5f; color: #60a5fa; }
    .badge-feature { background: #3b1f0b; color: #f59e0b; }
    .badge-group { background: #0b3b2e; color: #34d399; }
  </style>
</head>
<body>
  <h1>随机森林特征审计报告</h1>
  <div class="meta">
    生成时间：${formatTime(report.createdAt)} &nbsp;|&nbsp;
    <span class="badge badge-training">训练样本 v${report.trainingVersion}</span>
    <span class="badge badge-feature">特征列表 v${report.featureVersion}</span>
    <span class="badge badge-group">客户分组 v${report.groupVersion}</span>
  </div>

  <h2>特征重要性 Top 20</h2>
  <table>
    <thead><tr><th>排名</th><th>特征名</th><th>重要性</th></tr></thead>
    <tbody>${featureRows}</tbody>
  </table>

  <h2>特征泄漏检测</h2>
  ${report.leakageFeatures.length > 0 ? `<table>
    <thead><tr><th>特征名</th><th>重要性</th><th>原因</th></tr></thead>
    <tbody>${leakageRows}</tbody>
  </table>` : '<p style="color:#71717a;">未检测到特征泄漏</p>'}

  <h2>分组稀疏分析</h2>
  ${report.sparseGroups.length > 0 ? `<table>
    <thead><tr><th>分组</th><th>样本量</th><th>稀疏情况</th></tr></thead>
    <tbody>${sparseRows}</tbody>
  </table>` : '<p style="color:#71717a;">无分组数据</p>'}

  <h2>冲突留痕</h2>
  ${report.conflicts.length > 0 ? `<table>
    <thead><tr><th>类型</th><th>严重性</th><th>描述</th><th>处理结果</th></tr></thead>
    <tbody>${conflictRows}</tbody>
  </table>` : '<p style="color:#71717a;">无冲突记录</p>'}
</body>
</html>`
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
