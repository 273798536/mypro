import type { CashFlowRecord, OperationLog } from '@/types'

export const STATUS_LABEL: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  withdrawn: '已撤回',
  reversal: '冲正',
}

export const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-warn/15 text-warn border-warn/40',
  confirmed: 'bg-success/15 text-success border-success/40',
  withdrawn: 'bg-muted/15 text-muted border-muted/40',
  reversal: 'bg-danger/15 text-danger border-danger/40',
}

function fmtMoney(n: number): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  return sign + '¥' + abs.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function generateMarkdownReport(
  records: CashFlowRecord[],
  logs: OperationLog[],
  generatedAt: string,
): string {
  const total = records.length
  const confirmed = records.filter(r => r.baseStatus === 'confirmed').length
  const pending = records.filter(r => r.baseStatus === 'pending').length
  const withdrawn = records.filter(r => r.baseStatus === 'withdrawn').length
  const reversals = records.filter(r => r.isReversal)
  const netAmount = records
    .filter(r => r.baseStatus !== 'withdrawn')
    .reduce((s, r) => s + r.amount, 0)

  const lines: string[] = []
  lines.push('# ABS 现金流风险预警报告')
  lines.push('')
  lines.push(`> 生成时间：${fmtTime(generatedAt)}`)
  lines.push('')
  lines.push('## 一、数据概览')
  lines.push('')
  lines.push('| 指标 | 数值 |')
  lines.push('|------|------|')
  lines.push(`| 记录总数 | ${total} 条 |`)
  lines.push(`| 已确认 | ${confirmed} 条 |`)
  lines.push(`| 待确认 | ${pending} 条 |`)
  lines.push(`| 已撤回 | ${withdrawn} 条 |`)
  lines.push(`| 负数冲正 | ${reversals.length} 条 |`)
  lines.push(`| 有效净额 | ${fmtMoney(netAmount)} |`)
  lines.push('')

  lines.push('## 二、现金流明细')
  lines.push('')
  lines.push('| 批次号 | 金额 | 状态 | 来源 | 导入时间 | 备注 |')
  lines.push('|--------|------|------|------|----------|------|')
  for (const r of records) {
    let statusLabel = STATUS_LABEL[r.baseStatus]
    if (r.isReversal) statusLabel = STATUS_LABEL.reversal + ' · ' + statusLabel
    lines.push(`| ${r.batchNo} | ${fmtMoney(r.amount)} | ${statusLabel} | ${r.source.replace(/\|/g, '／')} | ${fmtTime(r.importedAt)} | ${r.note ? r.note.replace(/\|/g, '／').replace(/\n/g, ' ') : '—'} |`)
  }
  lines.push('')

  if (reversals.length > 0) {
    lines.push('## 三、冲正记录风险提示')
    lines.push('')
    lines.push('> ⚠️ 以下记录为负数冲正，请核对后补凭证是否与原交易匹配。')
    lines.push('')
    for (const r of reversals) {
      let statusLabel = STATUS_LABEL[r.baseStatus]
      lines.push(`- **${r.batchNo}** 金额 ${fmtMoney(r.amount)}（${statusLabel}）— 来源：${r.source}`)
    }
    lines.push('')
  }

  lines.push('## 四、最近操作轨迹')
  lines.push('')
  const recentLogs = [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 15)
  for (const log of recentLogs) {
    lines.push(`- ${fmtTime(log.timestamp)} · ${log.operator} · ${log.detail}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('*本报告由系统自动生成，数据状态以页面实时显示为准。*')
  return lines.join('\n')
}

export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function reportFileName(generatedAt: string): string {
  const d = new Date(generatedAt)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `ABS现金流风险预警_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.md`
}
