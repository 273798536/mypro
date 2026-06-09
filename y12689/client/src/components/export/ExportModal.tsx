import { useEffect, useMemo, useState } from 'react'
import { X, Download, FileText, FileSpreadsheet, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { NormalRecord, Severity } from '@/types'

interface ExportModalProps {
  open: boolean
  records: NormalRecord[]
  onClose: () => void
}

function getSeverityLabel(severity: Severity | null): string {
  switch (severity) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    default:
      return '低'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'failed':
      return '不合格'
    case 'review':
      return '待复核'
    case 'passed':
      return '已通过'
    case 'pending':
      return '待处理'
    default:
      return status
  }
}

function ExportModal({ open, records, onClose }: ExportModalProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [open, onClose])

  const stats = useMemo(() => {
    return {
      total: records.length,
      failed: records.filter((r) => r.status === 'failed').length,
      review: records.filter((r) => r.status === 'review').length,
      passed: records.filter((r) => r.status === 'passed').length,
    }
  }, [records])

  const failedRecords = useMemo(
    () => records.filter((r) => r.status === 'failed'),
    [records],
  )

  const reviewRecords = useMemo(
    () => records.filter((r) => r.status === 'review'),
    [records],
  )

  const handleDownloadHTML = () => {
    const failedRows = failedRecords
      .map(
        (r) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;">${r.id.slice(0, 8)}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${r.deviceId}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${getSeverityLabel(r.occlusion?.severity)}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${r.occlusion?.reason || '法线偏差超过阈值'}</td>
        </tr>
      `,
      )
      .join('')

    const failedDetails = failedRecords
      .map(
        (r) => `
        <div style="margin:16px 0;padding:12px 16px;border-left:4px solid #ff4d4f;background:#fff5f5;">
          <div style="font-weight:600;margin-bottom:8px;">记录 #${r.id.slice(0, 8)} - ${r.deviceId}</div>
          <div style="color:#666;font-size:14px;line-height:1.6;">
            ${r.occlusion?.reason || `法线平均偏差 ${r.normalDeviation.toFixed(2)}°，超过阈值 15°`}
          </div>
          <div style="margin-top:8px;font-size:13px;color:#999;">
            点数: ${r.pointCount.toLocaleString()} | 操作人: ${r.operator}
          </div>
        </div>
      `,
      )
      .join('')

    const reviewRows = reviewRecords
      .map(
        (r) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;">${r.id.slice(0, 8)}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${r.deviceId}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${r.timestamp}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${r.operator}</td>
        </tr>
      `,
      )
      .join('')

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>复杂曲面法线练习 - 月度审查报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #333; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 32px; font-size: 14px; }
    .summary { display: flex; gap: 16px; margin-bottom: 32px; }
    .summary-item { flex: 1; padding: 16px; border-radius: 8px; text-align: center; }
    .summary-item .num { font-size: 28px; font-weight: 700; }
    .summary-item .label { font-size: 13px; color: #666; margin-top: 4px; }
    h2 { font-size: 18px; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #f0f0f0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 13px; border: 1px solid #ddd; }
    td { font-size: 13px; }
    .footer { margin-top: 48px; text-align: center; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>复杂曲面法线练习 - 月度审查报告</h1>
  <p class="subtitle">生成时间: ${new Date().toLocaleString('zh-CN')}</p>

  <div class="summary">
    <div class="summary-item" style="background:#fff1f0;">
      <div class="num" style="color:#ff4d4f;">${stats.failed}</div>
      <div class="label">不合格</div>
    </div>
    <div class="summary-item" style="background:#fffbe6;">
      <div class="num" style="color:#faad14;">${stats.review}</div>
      <div class="label">待复核</div>
    </div>
    <div class="summary-item" style="background:#f6ffed;">
      <div class="num" style="color:#52c41a;">${stats.passed}</div>
      <div class="label">已通过</div>
    </div>
    <div class="summary-item" style="background:#e6f7ff;">
      <div class="num" style="color:#1890ff;">${stats.total}</div>
      <div class="label">总记录</div>
    </div>
  </div>

  <h2>不合格记录</h2>
  ${failedRecords.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>记录ID</th>
        <th>设备</th>
        <th>严重程度</th>
        <th>判定原因</th>
      </tr>
    </thead>
    <tbody>
      ${failedRows}
    </tbody>
  </table>

  <h2>不合格详细说明</h2>
  ${failedDetails}
  ` : '<p style="color:#666;">暂无不合格记录</p>'}

  ${reviewRecords.length > 0 ? `
  <h2>待复核记录</h2>
  <table>
    <thead>
      <tr>
        <th>记录ID</th>
        <th>设备</th>
        <th>时间</th>
        <th>操作人</th>
      </tr>
    </thead>
    <tbody>
      ${reviewRows}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">本报告由系统自动生成</div>
</body>
</html>
`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `法线审查报告_${new Date().toISOString().slice(0, 10)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadCSV = () => {
    const headers = ['记录ID', '设备ID', '状态', '严重程度', '操作人', '时间', '点数', '法线偏差', '判定原因']
    const rows = records.map((r) => [
      r.id.slice(0, 8),
      r.deviceId,
      getStatusLabel(r.status),
      getSeverityLabel(r.occlusion?.severity),
      r.operator,
      r.timestamp,
      r.pointCount,
      r.normalDeviation.toFixed(2),
      r.occlusion?.reason || '',
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `法线审查数据_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            导出审查报告
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-danger mb-1">
                <XCircle size={16} />
                <span className="text-2xl font-bold">{stats.failed}</span>
              </div>
              <div className="text-xs text-text-muted">不合格</div>
            </div>
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-warning mb-1">
                <Clock size={16} />
                <span className="text-2xl font-bold">{stats.review}</span>
              </div>
              <div className="text-xs text-text-muted">待复核</div>
            </div>
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-success mb-1">
                <CheckCircle2 size={16} />
                <span className="text-2xl font-bold">{stats.passed}</span>
              </div>
              <div className="text-xs text-text-muted">已通过</div>
            </div>
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <FileText size={16} />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
              <div className="text-xs text-text-muted">总记录</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-text-muted" />
              <span className="text-sm text-text-muted">时间范围:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 rounded-md bg-bg-dark text-text-primary text-sm border border-border hover:border-border-hover focus:outline-none focus:border-primary"
            />
            <span className="text-text-muted">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 rounded-md bg-bg-dark text-text-primary text-sm border border-border hover:border-border-hover focus:outline-none focus:border-primary"
            />
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-bg-hover border-b border-border">
              <span className="text-sm font-medium text-text-primary">报告预览</span>
            </div>
            <div
              className="bg-white text-gray-900 p-8 max-h-[400px] overflow-y-auto"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              <h1 className="text-center text-2xl font-bold text-gray-900 mb-2">
                复杂曲面法线练习 - 月度审查报告
              </h1>
              <p className="text-center text-sm text-gray-500 mb-6">
                生成时间: {new Date().toLocaleString('zh-CN')}
              </p>

              <h2 className="text-base font-semibold mt-4 mb-2 pb-1 border-b-2 border-gray-100">
                不合格记录
              </h2>
              {failedRecords.length > 0 ? (
                <table className="w-full text-sm border-collapse mb-3">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-2 border border-gray-200 text-left">记录ID</th>
                      <th className="p-2 border border-gray-200 text-left">设备</th>
                      <th className="p-2 border border-gray-200 text-left">严重程度</th>
                      <th className="p-2 border border-gray-200 text-left">判定原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedRecords.map((r) => (
                      <tr key={r.id}>
                        <td className="p-2 border border-gray-200 font-mono">{r.id.slice(0, 8)}</td>
                        <td className="p-2 border border-gray-200">{r.deviceId}</td>
                        <td className="p-2 border border-gray-200">{getSeverityLabel(r.occlusion?.severity)}</td>
                        <td className="p-2 border border-gray-200">{r.occlusion?.reason || '法线偏差超过阈值'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">暂无不合格记录</p>
              )}

              {failedRecords.length > 0 && (
                <>
                  <h2 className="text-base font-semibold mt-4 mb-2 pb-1 border-b-2 border-gray-100">
                    不合格详细说明
                  </h2>
                  <div className="space-y-2">
                    {failedRecords.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 border-l-4 border-red-500 bg-red-50"
                      >
                        <div className="font-semibold text-sm mb-1">
                          记录 #{r.id.slice(0, 8)} - {r.deviceId}
                        </div>
                        <div className="text-sm text-gray-700">
                          {r.occlusion?.reason || `法线平均偏差 ${r.normalDeviation.toFixed(2)}°，超过阈值 15°`}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          点数: {r.pointCount.toLocaleString()} | 操作人: {r.operator}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {reviewRecords.length > 0 && (
                <>
                  <h2 className="text-base font-semibold mt-4 mb-2 pb-1 border-b-2 border-gray-100">
                    待复核记录
                  </h2>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 border border-gray-200 text-left">记录ID</th>
                        <th className="p-2 border border-gray-200 text-left">设备</th>
                        <th className="p-2 border border-gray-200 text-left">时间</th>
                        <th className="p-2 border border-gray-200 text-left">操作人</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="p-2 border border-gray-200 font-mono">{r.id.slice(0, 8)}</td>
                          <td className="p-2 border border-gray-200">{r.deviceId}</td>
                          <td className="p-2 border border-gray-200">{r.timestamp}</td>
                          <td className="p-2 border border-gray-200">{r.operator}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md text-sm text-text-secondary border border-border hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleDownloadCSV}
            className="h-9 px-4 rounded-md text-sm text-text-secondary border border-border hover:bg-bg-hover hover:text-text-primary transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet size={16} />
            下载 CSV
          </button>
          <button
            onClick={handleDownloadHTML}
            className="h-9 px-5 rounded-md text-sm text-white bg-primary hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            下载 HTML 报告
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
