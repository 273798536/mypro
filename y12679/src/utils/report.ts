import type { AnalysisResult, ViolationType } from '@/types'

const getViolationTypeLabel = (type: ViolationType): string => {
  switch (type) {
    case 'critical':
      return '严重越界'
    case 'warning':
      return '警告级越界'
    default:
      return '正常'
  }
}

const getViolationTypeColor = (type: ViolationType): string => {
  switch (type) {
    case 'critical':
      return '#ef4444'
    case 'warning':
      return '#f59e0b'
    default:
      return '#10b981'
  }
}

export const generateReportHTML = (result: AnalysisResult): string => {
  const generatedAtStr = new Date(result.generatedAt).toLocaleString('zh-CN')

  const statusBadge =
    result.violatedCount === 0
      ? '<span style="background:#10b981;color:#fff;padding:4px 12px;border-radius:4px;font-weight:bold;">通过</span>'
      : result.criticalCount > 0
      ? '<span style="background:#ef4444;color:#fff;padding:4px 12px;border-radius:4px;font-weight:bold;">严重不合格</span>'
      : '<span style="background:#f59e0b;color:#fff;padding:4px 12px;border-radius:4px;font-weight:bold;">待确认</span>'

  const crossSectionRows = result.crossSectionDetails
    .map((cs) => {
      const color = getViolationTypeColor(cs.violationType)
      const label = getViolationTypeLabel(cs.violationType)
      const violationsHtml = cs.violations
        .map(
          (v) => `
          <div style="margin-top:8px;padding:10px;background:#fef2f2;border-left:3px solid ${color};border-radius:0 4px 4px 0;">
            <div style="font-weight:bold;color:#1f2937;margin-bottom:4px;">
              越界类型：${v.type} | 严重程度：${v.severity === 3 ? '高' : v.severity === 2 ? '中' : '低'}
            </div>
            <div style="color:#4b5563;margin-bottom:6px;font-size:13px;">
              <strong>原因说明：</strong>${v.reason}
            </div>
            <div style="color:#4b5563;margin-bottom:6px;font-size:13px;">
              <strong>位置坐标：</strong>(${v.position.x.toFixed(0)}, ${v.position.y.toFixed(0)}) 
              ${v.distance > 0 ? `| 距离剖切面：${v.distance.toFixed(1)}px` : ''}
            </div>
            <div style="color:#065f46;font-size:13px;background:#ecfdf5;padding:6px 10px;border-radius:4px;">
              <strong>修正建议：</strong>${v.suggestedFix}
            </div>
          </div>
        `
        )
        .join('')

      return `
        <tr>
          <td style="padding:12px;border:1px solid #e5e7eb;">${cs.name}</td>
          <td style="padding:12px;border:1px solid #e5e7eb;text-align:center;">
            <span style="background:${color};color:#fff;padding:3px 10px;border-radius:3px;font-size:12px;">${label}</span>
          </td>
          <td style="padding:12px;border:1px solid #e5e7eb;">
            ${cs.violations.length > 0 ? violationsHtml : '<span style="color:#6b7280;">无越界记录</span>'}
          </td>
        </tr>
      `
    })
    .join('')

  const screenshotsHtml =
    result.screenshots.length > 0
      ? `
    <div style="margin-top:32px;">
      <h2 style="font-size:20px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">四、截图证据清单</h2>
      <p style="color:#64748b;margin-top:8px;">以下为分析过程中捕获的关键节点截图，配合碰撞检测结果辅助判断越界情况。</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:16px;">
        ${result.screenshots
          .map(
            (s, i) => `
          <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="background:#f8fafc;padding:8px 12px;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;">
              <strong>截图 #${i + 1}</strong> | ${new Date(s.timestamp).toLocaleTimeString('zh-CN')}
              ${s.hasViolation ? '<span style="float:right;background:#ef4444;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;">含越界</span>' : ''}
            </div>
            <img src="${s.imageData}" style="width:100%;height:160px;object-fit:cover;display:block;" />
            <div style="padding:10px;font-size:13px;">
              <div style="color:#334155;margin-bottom:6px;"><strong>说明：</strong>${s.description || '无描述'}</div>
              ${
                s.detectedViolations.length > 0
                  ? `<div style="color:#dc2626;font-size:12px;"><strong>检测到：</strong>${s.detectedViolations.join('；')}</div>`
                  : ''
              }
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `
      : ''

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>大型机房气流路径剖切面越界分析报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; margin: 0; padding: 40px; background: #f1f5f9; color: #1e293b; }
    .container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 48px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    h1 { font-size: 28px; color: #0f172a; margin: 0 0 8px 0; }
    h2 { font-size: 20px; color: #1e293b; margin-top: 32px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f1f5f9; padding: 12px; text-align: left; border: 1px solid #e5e7eb; font-size: 14px; color: #334155; }
    td { font-size: 14px; vertical-align: top; }
    .meta-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 20px; }
    .stat-card { padding: 16px; border-radius: 8px; text-align: center; }
    .stat-card .num { font-size: 32px; font-weight: bold; }
    .stat-card .label { font-size: 13px; color: #64748b; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>大型机房气流路径剖切面越界分析报告</h1>
    <div class="meta-row">
      <div>
        <div style="color:#64748b;font-size:14px;">分析样例：<strong style="color:#1e293b;">${result.sampleName}</strong></div>
        <div style="color:#64748b;font-size:14px;margin-top:4px;">报告生成时间：${generatedAtStr}</div>
      </div>
      <div>${statusBadge}</div>
    </div>

    <h2 style="font-size:20px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-top:32px;">一、总体评估</h2>
    <p style="color:#475569;margin-top:8px;">
      本报告针对机房气流路径进行剖切面越界检测，分析剖切面与气流路径的距离关系，以及气流是否超出安全边界。
      颜色仅为辅助标识，具体判断请以文字说明为准。
    </p>

    <div class="stat-grid">
      <div class="stat-card" style="background:#eff6ff;">
        <div class="num" style="color:#2563eb;">${result.totalCrossSections}</div>
        <div class="label">剖切面总数</div>
      </div>
      <div class="stat-card" style="background:#f0fdf4;">
        <div class="num" style="color:#16a34a;">${result.totalCrossSections - result.violatedCount}</div>
        <div class="label">正常剖切面</div>
      </div>
      <div class="stat-card" style="background:#fffbeb;">
        <div class="num" style="color:#d97706;">${result.warningCount}</div>
        <div class="label">警告级越界</div>
      </div>
      <div class="stat-card" style="background:#fef2f2;">
        <div class="num" style="color:#dc2626;">${result.criticalCount}</div>
        <div class="label">严重越界</div>
      </div>
    </div>

    <h2 style="font-size:20px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-top:32px;">二、剖切面越界详情</h2>
    <p style="color:#64748b;margin-top:8px;">
      下表列出每个剖切面的检测结果。<span style="color:#10b981;">绿色</span>表示正常，
      <span style="color:#f59e0b;">橙色</span>表示警告级越界（接近阈值需关注），
      <span style="color:#ef4444;">红色</span>表示严重越界（已超出安全范围需整改）。
    </p>
    <table>
      <thead>
        <tr>
          <th style="width:25%;">剖切面名称</th>
          <th style="width:15%;">检测状态</th>
          <th>越界详情与修正建议</th>
        </tr>
      </thead>
      <tbody>
        ${crossSectionRows}
      </tbody>
    </table>

    <h2 style="font-size:20px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-top:32px;">三、总结与建议</h2>
    <div style="margin-top:16px;padding:16px;background:${result.violatedCount === 0 ? '#f0fdf4' : result.criticalCount > 0 ? '#fef2f2' : '#fffbeb'};border-radius:8px;border-left:4px solid ${result.violatedCount === 0 ? '#10b981' : result.criticalCount > 0 ? '#ef4444' : '#f59e0b'};">
      ${
        result.violatedCount === 0
          ? '<p style="margin:0;color:#065f46;"><strong>结论：</strong>所有剖切面均在安全范围内，气流组织良好，当前机房工况正常，可按当前参数继续运行。</p>'
          : result.criticalCount > 0
          ? `<p style="margin:0;color:#991b1b;"><strong>结论：</strong>检测到 ${result.criticalCount} 处严重越界和 ${result.warningCount} 处警告级越界，存在明显的气流短路或边界溢出问题。</p>
             <p style="margin:8px 0 0 0;color:#991b1b;"><strong>紧急建议：</strong>立即暂停相关设备运行，按照各剖切面的修正建议进行调整，调整完成后重新运行检测。</p>`
          : `<p style="margin:0;color:#92400e;"><strong>结论：</strong>检测到 ${result.warningCount} 处警告级越界，虽然未达到严重程度，但已接近安全阈值，需要持续关注。</p>
             <p style="margin:8px 0 0 0;color:#92400e;"><strong>建议：</strong>请在3个工作日内安排人工复核，结合现场实际情况决定是否需要调整气流路径或剖切面位置。</p>`
      }
    </div>

    ${screenshotsHtml}

    <div style="margin-top:48px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
      本报告由大型机房气流路径分析系统自动生成 | 仅作为技术参考，最终决策请结合现场实际情况
    </div>
  </div>
</body>
</html>
`
}

export const downloadReport = (result: AnalysisResult) => {
  const html = generateReportHTML(result)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `气流路径分析报告_${result.sampleId}_${Date.now()}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
