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

  const detail = report.auditDetail
  const groupSourceText = {
    training_only: "仅使用训练样本中的 group_id",
    group_file: "完全来自客户分组文件",
    mixed: "混合模式（客户分组文件为主，未映射分组标记为未映射分组）",
  }[detail.calculationMeta.groupSource]

  const versionRows = detail.versions
    .map(
      (v) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">
          <span class="badge badge-${v.source}">${v.source === "training" ? "训练样本" : v.source === "feature" ? "特征列表" : "客户分组"}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;${v.isLate ? "color:#ef4444;font-weight:bold;" : ""}">
          ${v.version}${v.isLate ? " ⚠ 延迟到达" : ""}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${formatTime(v.importedAt)}</td>
      </tr>`
    )
    .join("")

  const allGroupRows = detail.groups
    .map(
      (g) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${g.groupId}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${g.groupName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;${g.sampleCount === 0 ? "color:#f59e0b;" : ""}">${g.sampleCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">
          ${Object.entries(g.featureCoverage).map(([f, c]) => `${f}: ${(c * 100).toFixed(0)}%`).join(" | ")}
        </td>
      </tr>`
    )
    .join("")

  const targetDistRows = detail.sourceMeta.training?.targetDistribution
    ? Object.entries(detail.sourceMeta.training.targetDistribution)
        .map(
          ([k, v]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${k}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${v}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">${((v / detail.calculationMeta.totalSamples) * 100).toFixed(2)}%</td>
      </tr>`
        )
        .join("")
    : ""

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>随机森林特征审计报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f0f1a; color: #e4e4e7; margin: 0; padding: 40px; }
    h1 { color: #f59e0b; font-size: 24px; margin-bottom: 8px; }
    h2 { color: #a1a1aa; font-size: 18px; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid #2a2a3e; padding-bottom: 8px; }
    h3 { color: #71717a; font-size: 15px; margin-top: 20px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
    th { background: #252540; padding: 10px 12px; text-align: left; color: #a1a1aa; font-weight: 600; font-size: 13px; }
    td { padding: 8px 12px; border-bottom: 1px solid #2a2a33; }
    .meta { color: #71717a; font-size: 13px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; }
    .badge-training { background: #1e3a5f; color: #60a5fa; }
    .badge-feature { background: #3b1f0b; color: #f59e0b; }
    .badge-group { background: #0b3b2e; color: #34d399; }
    .info-box { background: #1a1a2e; border: 1px solid #2a2a33; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .info-row { display: flex; margin-bottom: 8px; font-size: 14px; }
    .info-label { color: #71717a; width: 180px; flex-shrink: 0; }
    .info-value { color: #e4e4e7; }
    .info-value.highlight { color: #f59e0b; font-weight: 600; }
    .section-divider { height: 1px; background: #2a2a33; margin: 24px 0; }
    .report-id { color: #06b6d4; font-family: monospace; font-size: 12px; }
    .empty-state { color: #71717a; padding: 16px; }
  </style>
</head>
<body>
  <h1>随机森林特征审计报告</h1>
  <div class="meta">
    报告ID：<span class="report-id">${report.id}</span> &nbsp;|&nbsp;
    生成时间：${formatTime(report.createdAt)}
  </div>
  <div class="meta">
    <span class="badge badge-training">训练样本 v${report.trainingVersion}</span>
    <span class="badge badge-feature">特征列表 v${report.featureVersion}</span>
    <span class="badge badge-group">客户分组 v${report.groupVersion}</span>
  </div>

  <h2>一、数据来源与计算元数据</h2>
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">总样本数</span>
      <span class="info-value highlight">${detail.calculationMeta.totalSamples}</span>
    </div>
    <div class="info-row">
      <span class="info-label">总特征数</span>
      <span class="info-value highlight">${detail.calculationMeta.totalFeatures}</span>
    </div>
    <div class="info-row">
      <span class="info-label">总分组数</span>
      <span class="info-value highlight">${detail.calculationMeta.totalGroups}</span>
    </div>
    <div class="info-row">
      <span class="info-label">分组数据来源</span>
      <span class="info-value">${groupSourceText}</span>
    </div>
    <div class="info-row">
      <span class="info-label">重要性计算种子</span>
      <span class="info-value" style="font-family:monospace;font-size:12px;">${detail.calculationMeta.importanceSeedSalt}</span>
    </div>
  </div>

  <h2>二、版本时序与对应明细</h2>
  <table>
    <thead><tr><th>数据类型</th><th>版本号</th><th>导入时间</th></tr></thead>
    <tbody>${versionRows}</tbody>
  </table>

  <h2>三、数据源元数据</h2>

  ${detail.sourceMeta.training ? `
  <h3>训练样本</h3>
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">行数</span>
      <span class="info-value">${detail.sourceMeta.training.rowCount}</span>
    </div>
    <div class="info-row">
      <span class="info-label">列名</span>
      <span class="info-value">${detail.sourceMeta.training.headers.join(", ")}</span>
    </div>
    <div class="info-row">
      <span class="info-label">样本ID范围</span>
      <span class="info-value">${detail.sourceMeta.training.sampleIdRange[0]} ~ ${detail.sourceMeta.training.sampleIdRange[1]}</span>
    </div>
  </div>
  <h3>目标变量分布</h3>
  <table>
    <thead><tr><th>目标值</th><th>样本数</th><th>占比</th></tr></thead>
    <tbody>${targetDistRows}</tbody>
  </table>
  ` : '<p class="empty-state">未导入训练样本</p>'}

  ${detail.sourceMeta.feature ? `
  <h3>特征列表</h3>
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">行数</span>
      <span class="info-value">${detail.sourceMeta.feature.rowCount}</span>
    </div>
    <div class="info-row">
      <span class="info-label">列名</span>
      <span class="info-value">${detail.sourceMeta.feature.headers.join(", ")}</span>
    </div>
    <div class="info-row">
      <span class="info-label">有效特征数</span>
      <span class="info-value">${detail.sourceMeta.feature.featureCount}</span>
    </div>
  </div>
  ` : '<p class="empty-state">未导入特征列表</p>'}

  ${detail.sourceMeta.group ? `
  <h3>客户分组</h3>
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">行数</span>
      <span class="info-value">${detail.sourceMeta.group.rowCount}</span>
    </div>
    <div class="info-row">
      <span class="info-label">列名</span>
      <span class="info-value">${detail.sourceMeta.group.headers.join(", ")}</span>
    </div>
    <div class="info-row">
      <span class="info-label">分组数</span>
      <span class="info-value">${detail.sourceMeta.group.groupCount}</span>
    </div>
  </div>
  ` : '<p class="empty-state">未导入客户分组</p>'}

  <h2>四、完整分组明细（含覆盖率）</h2>
  <table>
    <thead><tr><th>分组ID</th><th>分组名称</th><th>样本数</th><th>各特征覆盖率</th></tr></thead>
    <tbody>${allGroupRows}</tbody>
  </table>

  <h2>五、特征重要性 Top 20</h2>
  <table>
    <thead><tr><th>排名</th><th>特征名</th><th>重要性</th></tr></thead>
    <tbody>${featureRows}</tbody>
  </table>

  <h2>六、特征泄漏检测</h2>
  ${report.leakageFeatures.length > 0 ? `<table>
    <thead><tr><th>特征名</th><th>重要性</th><th>原因</th></tr></thead>
    <tbody>${leakageRows}</tbody>
  </table>` : '<p class="empty-state">未检测到特征泄漏</p>'}

  <h2>七、分组稀疏分析（稀疏分组）</h2>
  ${report.sparseGroups.length > 0 ? `<table>
    <thead><tr><th>分组</th><th>样本量</th><th>稀疏情况</th></tr></thead>
    <tbody>${sparseRows}</tbody>
  </table>` : '<p class="empty-state">无稀疏分组</p>'}

  <h2>八、冲突留痕</h2>
  ${report.conflicts.length > 0 ? `<table>
    <thead><tr><th>类型</th><th>严重性</th><th>描述</th><th>处理结果</th></tr></thead>
    <tbody>${conflictRows}</tbody>
  </table>` : '<p class="empty-state">无冲突记录</p>'}

  <div class="section-divider"></div>
  <div class="meta" style="text-align:center;margin-top:24px;">
    本报告由随机森林特征审计工具自动生成 · 报告ID ${report.id}
  </div>
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
