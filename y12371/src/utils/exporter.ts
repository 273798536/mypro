import type { Score, Version, Annotation, Part, Anomaly } from '../types'
import {
  getAnnotationStatusLabel,
  getAnomalyStatusLabel,
  getAnomalyTypeLabel,
  formatDate,
} from './helpers'

export interface ExportResult {
  blob: Blob
  fileName: string
  dataUrl: string
  mimeType: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildExportFileName(score: Score): string {
  const safeTitle = score.title
    .replace(/[\\/:*?"<>|\s]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `${safeTitle || 'score'}_导出_${stamp}.html`
}

export function generateScoreExportHtml(params: {
  score: Score
  versions: Version[]
  annotations: Annotation[]
  parts: Part[]
  anomalies: Anomaly[]
  originalPdfDataUrl?: string
}): string {
  const { score, versions, annotations, parts, anomalies, originalPdfDataUrl } = params

  const mergedAnnotations = annotations.filter(
    (a) => a.status === 'merged' || a.status === 'conflict'
  )
  const openAnomalies = anomalies.filter((a) => a.status !== 'resolved')

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      background: #0d1326;
      color: #e5e7eb;
      padding: 40px 24px;
      line-height: 1.6;
    }
    .container { max-width: 960px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #1a2444 0%, #0f172a 100%);
      border: 1px solid #d4af3733;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 28px;
    }
    .header h1 {
      font-size: 28px;
      color: #d4af37;
      margin-bottom: 8px;
      letter-spacing: 2px;
    }
    .header .composer { font-size: 16px; color: #94a3b8; margin-bottom: 16px; }
    .header .meta { display: flex; gap: 24px; flex-wrap: wrap; font-size: 13px; color: #cbd5e1; }
    .header .meta span { background: #1e293b; padding: 4px 12px; border-radius: 6px; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 12px;
    }
    .status-normal { background: #10b98120; color: #10b981; border: 1px solid #10b98140; }
    .status-pending { background: #f59e0b20; color: #f59e0b; border: 1px solid #f59e0b40; }
    .status-anomaly { background: #ef444420; color: #ef4444; border: 1px solid #ef444440; }
    section { margin-bottom: 28px; }
    section h2 {
      font-size: 18px;
      color: #d4af37;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    section h2 .count {
      background: #d4af3720;
      color: #d4af37;
      font-size: 12px;
      padding: 2px 10px;
      border-radius: 999px;
    }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 10px; overflow: hidden; }
    th {
      background: #334155;
      color: #d4af37;
      text-align: left;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 600;
    }
    td { padding: 12px 16px; font-size: 13px; border-top: 1px solid #334155; color: #cbd5e1; }
    tr:hover td { background: #33415540; }
    .empty {
      background: #1e293b;
      border-radius: 10px;
      padding: 32px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    .version-item {
      background: #1e293b;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 12px;
      border-left: 4px solid #d4af37;
    }
    .version-item.current { border-left-color: #10b981; }
    .version-item h3 { font-size: 15px; color: #fff; margin-bottom: 4px; }
    .version-item .source { font-size: 12px; color: #94a3b8; margin-bottom: 6px; }
    .version-item .note {
      font-size: 12px;
      color: #d4af37;
      background: #d4af3710;
      padding: 6px 10px;
      border-radius: 6px;
      display: inline-block;
    }
    .annotation-status, .anomaly-status {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #334155;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .pdf-preview {
      margin-top: 16px;
      background: #1e293b;
      border-radius: 10px;
      padding: 16px;
    }
    .pdf-preview embed { width: 100%; height: 600px; border-radius: 8px; }
  `

  const statusClass =
    score.status === 'normal' ? 'status-normal' :
    score.status === 'pending' ? 'status-pending' : 'status-anomaly'

  const statusLabel =
    score.status === 'normal' ? '正常' :
    score.status === 'pending' ? '待确认' : '异常'

  const statusBadge = `<span class="status-badge ${statusClass}">${statusLabel}</span>`

  const versionsHtml = versions.length > 0
    ? versions.map((v, i) => `
      <div class="version-item ${i === 0 ? 'current' : ''}">
        <h3>版本 ${v.versionNumber}${i === 0 ? ' · 当前' : ''}</h3>
        <div class="source">来源: ${escapeHtml(v.source)} · ${formatDate(v.createdAt)}</div>
        ${v.note ? `<div class="note">${escapeHtml(v.note)}</div>` : ''}
      </div>
    `).join('')
    : `<div class="empty">暂无版本记录</div>`

  const partsHtml = parts.length > 0
    ? `
      <table>
        <thead>
          <tr>
            <th>声部名称</th>
            <th>乐器</th>
            <th>小节范围</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${parts.map((p) => `
            <tr>
              <td>${escapeHtml(p.name)}</td>
              <td>${escapeHtml(p.instrument)}</td>
              <td>${escapeHtml(p.measureRange)}</td>
              <td>${p.confirmed
                ? '<span class="annotation-status" style="background:#10b98120;color:#10b981;">已确认</span>'
                : '<span class="annotation-status" style="background:#f59e0b20;color:#f59e0b;">待确认</span>'
              }</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">暂无声部清单</div>`

  const annotationsHtml = mergedAnnotations.length > 0
    ? `
      <table>
        <thead>
          <tr>
            <th>批注内容</th>
            <th>小节</th>
            <th>来源</th>
            <th>创建者</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${mergedAnnotations.map((a) => `
            <tr>
              <td>${escapeHtml(a.content)}</td>
              <td>${escapeHtml(a.measureRange)}</td>
              <td>${escapeHtml(a.source)}</td>
              <td>${escapeHtml(a.createdBy)}</td>
              <td>
                <span class="annotation-status" style="${
                  a.status === 'merged'
                    ? 'background:#10b98120;color:#10b981;'
                    : 'background:#ef444420;color:#ef4444;'
                }">${getAnnotationStatusLabel(a.status)}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">暂无合并批注</div>`

  const anomaliesHtml = openAnomalies.length > 0
    ? `
      <table>
        <thead>
          <tr>
            <th>类型</th>
            <th>描述</th>
            <th>状态</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          ${openAnomalies.map((a) => `
            <tr>
              <td>${escapeHtml(getAnomalyTypeLabel(a.type))}</td>
              <td>${escapeHtml(a.description)}</td>
              <td>
                <span class="anomaly-status" style="${
                  a.status === 'open' ? 'background:#ef444420;color:#ef4444;' :
                  a.status === 'confirmed' ? 'background:#f59e0b20;color:#f59e0b;' :
                  'background:#10b98120;color:#10b981;'
                }">${getAnomalyStatusLabel(a.status)}</span>
              </td>
              <td>${formatDate(a.createdAt)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">无未解决异常 ✓</div>`

  const pdfPreviewHtml = originalPdfDataUrl
    ? `
      <div class="pdf-preview">
        <p style="margin-bottom:12px;color:#94a3b8;font-size:13px;">原始曲谱 PDF 预览：</p>
        <embed src="${originalPdfDataUrl}" type="application/pdf" />
      </div>
    `
    : ''

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(score.title)} - 最终曲谱导出</title>
  <style>${css}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(score.title)}${statusBadge}</h1>
      <div class="composer">作曲: ${escapeHtml(score.composer)}</div>
      <div class="meta">
        <span>创建: ${formatDate(score.createdAt)}</span>
        <span>更新: ${formatDate(score.updatedAt)}</span>
        <span>声部: ${parts.length}</span>
        <span>批注: ${mergedAnnotations.length}</span>
        <span>异常: ${openAnomalies.length}</span>
      </div>
    </div>

    <section>
      <h2>版本历史 <span class="count">${versions.length}</span></h2>
      ${versionsHtml}
    </section>

    <section>
      <h2>声部清单 <span class="count">${parts.length}</span></h2>
      ${partsHtml}
    </section>

    <section>
      <h2>合并批注 <span class="count">${mergedAnnotations.length}</span></h2>
      ${annotationsHtml}
    </section>

    <section>
      <h2>异常记录 <span class="count">${openAnomalies.length}</span></h2>
      ${anomaliesHtml}
    </section>

    ${pdfPreviewHtml}

    <div class="footer">
      曲谱批注同步器 · 最终导出文件 · 生成于 ${formatDate(new Date().toISOString())}
    </div>
  </div>
</body>
</html>`

  return html
}

export function createExportFile(params: {
  score: Score
  versions: Version[]
  annotations: Annotation[]
  parts: Part[]
  anomalies: Anomaly[]
  originalPdfDataUrl?: string
}): Promise<ExportResult> {
  return new Promise((resolve, reject) => {
    try {
      const html = generateScoreExportHtml(params)
      const fileName = buildExportFileName(params.score)
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        resolve({
          blob,
          fileName,
          dataUrl,
          mimeType: 'text/html',
        })
      }
      reader.onerror = () => reject(new Error('读取导出文件失败'))
      reader.readAsDataURL(blob)
    } catch (e) {
      reject(e)
    }
  })
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}
