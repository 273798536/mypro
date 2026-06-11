import type {
  Point, CoordSystem, Station, FilterState, HandoverItem,
  Annotation, AnnotationNote, ScreenshotArchive,
} from '@/types'

interface ExportData {
  title: string
  generatedAt: string
  filter: FilterState
  stats: {
    total: number
    normal: number
    warning: number
    error: number
    processRate: number
    coordSystemDist: Record<string, number>
  }
  handoverItems: HandoverItem[]
  points: Point[]
  coordSystems: CoordSystem[]
  stations: Station[]
  annotations: Annotation[]
  annotationNotes: AnnotationNote[]
  screenshotArchives: ScreenshotArchive[]
  currentRoundName: string
}

const statusLabel: Record<string, string> = {
  pending: '待验证',
  verified: '已验证',
  supplement: '待补充',
  rejected: '已驳回',
  normal: '正常',
  warning: '告警',
  error: '异常',
}

const statusColor: Record<string, string> = {
  pending: '#fbbf24',
  verified: '#34d399',
  supplement: '#60a5fa',
  rejected: '#ef4444',
  normal: '#34d399',
  warning: '#fbbf24',
  error: '#e8743b',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateHandoverHtml(data: ExportData): string {
  const {
    title, generatedAt, filter, stats, handoverItems,
    points, coordSystems, stations, annotations,
    annotationNotes, screenshotArchives, currentRoundName,
  } = data

  const filterCoordNames = filter.coordSystemIds
    .map((id) => coordSystems.find((c) => c.id === id)?.name)
    .filter(Boolean)

  const filterStationNames = filter.stationIds
    .map((id) => stations.find((s) => s.id === id)?.name)
    .filter(Boolean)

  const filterStatusNames = filter.statuses.map((s) => statusLabel[s] || s)

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Noto Sans SC', sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    padding: 24px;
    line-height: 1.6;
  }
  .container { max-width: 1000px; margin: 0 auto; }
  .header {
    background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
    border: 1px solid #3b82f6;
    border-radius: 12px;
    padding: 24px 32px;
    margin-bottom: 24px;
  }
  .header h1 {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
  }
  .header .meta {
    color: #94a3b8;
    font-size: 13px;
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  .section {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 20px;
  }
  .section h2 {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid #334155;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section h2::before {
    content: '';
    width: 4px;
    height: 18px;
    background: #3b82f6;
    border-radius: 2px;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }
  .stat-card {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }
  .stat-card .value {
    font-size: 28px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
  }
  .stat-card .label {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
  }
  .filter-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
  }
  .tag strong { color: #e2e8f0; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th, td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid #334155;
  }
  th {
    background: #0f172a;
    font-weight: 600;
    color: #94a3b8;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  tr:hover td { background: #1e293b; }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
  }
  .status-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .coord-chart {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }
  .coord-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
  }
  .coord-name { width: 90px; color: #94a3b8; }
  .coord-bar {
    flex: 1;
    height: 8px;
    background: #334155;
    border-radius: 4px;
    overflow: hidden;
  }
  .coord-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 4px;
  }
  .coord-count {
    width: 30px;
    text-align: right;
    font-family: monospace;
    color: #e2e8f0;
  }
  .screenshot-preview {
    width: 80px;
    height: 45px;
    border-radius: 4px;
    object-fit: cover;
    border: 1px solid #334155;
  }
  .annotation-section {
    margin-top: 16px;
  }
  .annotation-item {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 12px;
  }
  .annotation-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .version-badge {
    background: #1e3a5f;
    color: #60a5fa;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    font-family: monospace;
  }
  .annotation-title {
    font-weight: 600;
    color: #e2e8f0;
  }
  .annotation-date {
    margin-left: auto;
    color: #64748b;
    font-size: 11px;
  }
  .annotation-desc {
    color: #94a3b8;
    font-size: 13px;
    margin-bottom: 8px;
  }
  .note-list {
    margin-top: 8px;
    padding-left: 16px;
  }
  .note-list li {
    color: #94a3b8;
    font-size: 12px;
    margin-bottom: 4px;
  }
  .note-author {
    color: #60a5fa;
    font-weight: 500;
  }
  .footer {
    text-align: center;
    color: #64748b;
    font-size: 11px;
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #334155;
  }
  @media print {
    body { background: #fff; color: #1e293b; }
    .section, .header, .stat-card, .annotation-item {
      background: #fff;
      border-color: #e2e8f0;
    }
    th { background: #f1f5f9; color: #475569; }
    tr:hover td { background: #f8fafc; }
    .tag { background: #f1f5f9; border-color: #e2e8f0; color: #475569; }
    .tag strong { color: #1e293b; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      <span>生成时间：${generatedAt}</span>
      <span>复核轮次：${escapeHtml(currentRoundName)}</span>
      <span>项目：山地索道站空间复核</span>
    </div>
  </div>

  <div class="section">
    <h2>筛选条件</h2>
    <div class="filter-tags">
      <span class="tag">坐标系：<strong>${filterCoordNames.length > 0 ? filterCoordNames.join('、') : '全部'}</strong></span>
      <span class="tag">站点：<strong>${filterStationNames.length > 0 ? filterStationNames.join('、') : '全部'}</strong></span>
      <span class="tag">状态：<strong>${filterStatusNames.length > 0 ? filterStatusNames.join('、') : '全部'}</strong></span>
      <span class="tag">偏差范围：<strong>${filter.deviationRange[0]}m - ${filter.deviationRange[1]}m</strong></span>
    </div>
  </div>

  <div class="section">
    <h2>统计概览</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="value" style="color:#e2e8f0">${stats.total}</div>
        <div class="label">总点位</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color:#34d399">${stats.normal}</div>
        <div class="label">正常</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color:#fbbf24">${stats.warning}</div>
        <div class="label">告警</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color:#e8743b">${stats.error}</div>
        <div class="label">异常</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color:#60a5fa">${stats.processRate.toFixed(1)}%</div>
        <div class="label">处理率</div>
      </div>
    </div>
    <div style="margin-top:20px">
      <h3 style="font-size:13px;font-weight:600;color:#94a3b8;margin-bottom:12px">坐标系分布</h3>
      <div class="coord-chart">
        ${Object.entries(stats.coordSystemDist).map(([name, count]) => {
          const max = Math.max(...Object.values(stats.coordSystemDist), 1)
          const pct = (count / max) * 100
          return `
          <div class="coord-row">
            <span class="coord-name">${escapeHtml(name)}</span>
            <div class="coord-bar">
              <div class="coord-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="coord-count">${count}</span>
          </div>
          `
        }).join('')}
      </div>
    </div>
  </div>

  <div class="section">
    <h2>交接明细</h2>
    <table>
      <thead>
        <tr>
          <th style="width:50px">序号</th>
          <th>批注来源</th>
          <th>问题描述</th>
          <th style="width:120px">截图预览</th>
          <th style="width:100px">确认状态</th>
          <th style="width:120px">验证人</th>
          <th style="width:140px">验证时间</th>
        </tr>
      </thead>
      <tbody>
        ${handoverItems.map((item, idx) => {
          const annotation = annotations.find((a) => a.id === item.annotationId)
          const point = points.find((p) => p.id === annotation?.pointId)
          return `
          <tr>
            <td style="color:#64748b;font-family:monospace">${idx + 1}</td>
            <td style="color:#94a3b8">${escapeHtml(point?.name || item.annotationId)}</td>
            <td>${escapeHtml(item.description)}</td>
            <td>${item.screenshotDataUrl
              ? `<img src="${item.screenshotDataUrl}" class="screenshot-preview" alt="截图">`
              : '<span style="color:#64748b;font-size:12px">—</span>'
            }</td>
            <td><span class="status-badge" style="background:${statusColor[item.verificationStatus]}20;border:1px solid ${statusColor[item.verificationStatus]}40;color:${statusColor[item.verificationStatus]}"><span style="background:${statusColor[item.verificationStatus]}"></span>${statusLabel[item.verificationStatus] || item.verificationStatus}</span></td>
            <td style="color:#94a3b8">${escapeHtml(item.verifiedBy || '—')}</td>
            <td style="color:#64748b;font-size:12px">${item.verifiedAt ? new Date(item.verifiedAt).toLocaleString('zh-CN') : '—'}</td>
          </tr>
          `
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>批注历史与截图</h2>
    <div class="annotation-section">
      ${handoverItems.map((item) => {
        const annotation = annotations.find((a) => a.id === item.annotationId)
        if (!annotation) return ''
        const point = points.find((p) => p.id === annotation.pointId)
        const cs = coordSystems.find((c) => c.id === point?.coordSystemId)
        const notes = annotationNotes.filter((n) => n.annotationId === annotation.id)
        const screenshots = screenshotArchives.filter((s) => s.annotationId === annotation.id)

        return `
        <div class="annotation-item">
          <div class="annotation-header">
            <span class="version-badge">v${annotation.version}</span>
            <span class="annotation-title">${escapeHtml(point?.name || annotation.id)}</span>
            <span style="color:#94a3b8;font-size:12px">${escapeHtml(cs?.name || '')}</span>
            <span class="annotation-date">${new Date(annotation.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
          <div class="annotation-desc">${escapeHtml(annotation.content)}</div>
          ${screenshots.length > 0 ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              ${screenshots.map((s) => `
                <div>
                  <img src="${s.dataUrl}" style="width:200px;height:112px;border-radius:6px;border:1px solid #334155;object-fit:cover" alt="${escapeHtml(s.description)}">
                  <div style="font-size:11px;color:#64748b;margin-top:4px">${escapeHtml(s.description)}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${notes.length > 0 ? `
            <ul class="note-list">
              ${notes.map((n) => `
                <li><span class="note-author">${escapeHtml(n.author)}</span>：${escapeHtml(n.content)} <span style="color:#64748b">(${new Date(n.createdAt).toLocaleDateString('zh-CN')})</span></li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
        `
      }).join('')}
    </div>
  </div>

  <div class="footer">
    本文档由山地索道站空间复核系统自动生成 | 仅供教学交接使用
  </div>
</div>
</body>
</html>`
}

export function downloadHtmlFile(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
