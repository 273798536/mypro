import type { StratumProfile, OperationRecord, Anomaly, Layer } from '../types'
import {
  ANOMALY_TYPE_LABELS,
  ANOMALY_STATUS_LABELS,
  SEVERITY_LABELS,
  OPERATION_TYPE_LABELS,
  UNIT_LABELS
} from '../types'

function formatDate(d: Date): string {
  if (typeof d === 'string') d = new Date(d)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function buildReportData(profile: StratumProfile, operations: OperationRecord[]) {
  const resolved = profile.anomalies.filter(a => a.status === 'resolved').length
  const ignored = profile.anomalies.filter(a => a.status === 'ignored').length
  const pending = profile.anomalies.filter(a => a.status === 'pending').length

  const anomalyTypeStats = profile.anomalies.reduce((acc, a) => {
    const label = ANOMALY_TYPE_LABELS[a.type]
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    profile: {
      name: profile.name,
      operator: profile.metadata.operator || '未记录',
      surveyDate: profile.metadata.surveyDate ? formatDate(profile.metadata.surveyDate) : '未记录',
      source: profile.metadata.source || '未记录',
      exportedAt: formatDate(new Date()),
      totalLayers: profile.layers.length,
      totalBoundaries: profile.boundaries.length,
      totalAnomalies: profile.anomalies.length,
      resolved,
      ignored,
      pending,
      completionRate: profile.anomalies.length === 0
        ? 100
        : Math.round(((resolved + ignored) / profile.anomalies.length) * 100)
    },
    anomalyTypeStats,
    layers: profile.layers.map((l, idx) => ({
      index: idx + 1,
      name: l.name,
      topDepth: l.depth.top,
      bottomDepth: l.depth.bottom,
      thickness: Math.abs(l.depth.bottom - l.depth.top),
      unit: UNIT_LABELS[l.unit],
      remarks: l.remarks || '无',
      source: l.source || '未记录'
    })),
    anomalies: profile.anomalies.map(a => ({
      id: a.id,
      typeName: ANOMALY_TYPE_LABELS[a.type],
      severity: SEVERITY_LABELS[a.severity],
      status: ANOMALY_STATUS_LABELS[a.status],
      description: a.description,
      explanation: a.explanation,
      suggestion: a.suggestion,
      createdAt: formatDate(a.createdAt),
      resolvedAt: a.resolvedAt ? formatDate(a.resolvedAt) : '',
      relatedOperations: a.relatedOperations,
      traceChain: a.traceChain
    })),
    operations: operations.map(op => ({
      id: op.id,
      typeName: OPERATION_TYPE_LABELS[op.type],
      description: op.description,
      timestamp: formatDate(op.timestamp),
      reversible: op.reversible ? '可撤销' : '不可撤销',
      operator: op.operator || '未记录'
    }))
  }
}

export function exportJSON(profile: StratumProfile, operations: OperationRecord[]): string {
  const data = buildReportData(profile, operations)
  return JSON.stringify({
    reportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    ...data
  }, null, 2)
}

export function downloadFile(filename: string, content: string, mime: string = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function generatePlainTextReport(profile: StratumProfile, operations: OperationRecord[]): string {
  const data = buildReportData(profile, operations)
  const lines: string[] = []

  lines.push('══════════════════════════════════════════════════')
  lines.push('           岩层剖面填色工具 - 复盘报告')
  lines.push('══════════════════════════════════════════════════')
  lines.push('')
  lines.push(`项目名称：${data.profile.name}`)
  lines.push(`操作员：${data.profile.operator}`)
  lines.push(`勘测日期：${data.profile.surveyDate}`)
  lines.push(`数据来源：${data.profile.source}`)
  lines.push(`导出时间：${data.profile.exportedAt}`)
  lines.push('')
  lines.push('────────────────────── 统计概览 ──────────────────────')
  lines.push(`岩层总数：${data.profile.totalLayers}`)
  lines.push(`边界总数：${data.profile.totalBoundaries}`)
  lines.push(`异常总数：${data.profile.totalAnomalies}`)
  lines.push(`  └─ 待处理：${data.profile.pending}`)
  lines.push(`  └─ 已处理：${data.profile.resolved}`)
  lines.push(`  └─ 已忽略：${data.profile.ignored}`)
  lines.push(`完成度：${data.profile.completionRate}%`)
  lines.push('')
  if (Object.keys(data.anomalyTypeStats).length > 0) {
    lines.push('异常类型分布：')
    Object.entries(data.anomalyTypeStats).forEach(([k, v]) => {
      lines.push(`  · ${k}：${v} 处`)
    })
    lines.push('')
  }

  lines.push('────────────────────── 岩层明细 ──────────────────────')
  data.layers.forEach(l => {
    lines.push(`【岩层 ${l.index}】${l.name}`)
    lines.push(`  顶部深度：${l.topDepth} ${l.unit}`)
    lines.push(`  底部深度：${l.bottomDepth} ${l.unit}`)
    lines.push(`  厚度：${l.thickness.toFixed(2)} ${l.unit}`)
    lines.push(`  数据来源：${l.source}`)
    if (l.remarks && l.remarks !== '无') {
      lines.push(`  备注：${l.remarks}`)
    }
    lines.push('')
  })

  lines.push('────────────────────── 异常详情 ──────────────────────')
  data.anomalies.forEach((a, idx) => {
    lines.push(`〔异常 ${idx + 1}〕${a.typeName} - 严重程度：${a.severity}`)
    lines.push(`  状态：${a.status}`)
    lines.push(`  问题描述：${a.description}`)
    lines.push('')
    lines.push('  ▸ 讲解备注：')
    lines.push(`    ${a.explanation}`)
    lines.push('')
    lines.push('  ▸ 处理意见：')
    lines.push(`    ${a.suggestion}`)
    lines.push('')
    if (a.traceChain && a.traceChain.processingHistory.length > 0) {
      lines.push('  ▸ 追溯链路（操作时间线）：')
      a.traceChain.processingHistory.forEach(step => {
        lines.push(`    [${step.step}] ${formatDate(step.timestamp)} | ${step.operator} | ${step.action}${step.notes ? ' - ' + step.notes : ''}`)
      })
      if (a.traceChain.finalResolution) {
        lines.push(`    → 最终结论：${a.traceChain.finalResolution.status === 'resolved' ? '已修正' : '已忽略'} - ${a.traceChain.finalResolution.conclusion}`)
      }
      lines.push('')
    }
  })

  lines.push('────────────────────── 操作记录 ──────────────────────')
  lines.push('（撤销/重做与本报告共用同一批记录）')
  lines.push('')
  if (data.operations.length === 0) {
    lines.push('  暂无操作记录')
  } else {
    data.operations.forEach((op, idx) => {
      lines.push(`  ${idx + 1}. [${op.timestamp}] ${op.typeName} - ${op.description}（${op.reversible}）`)
    })
  }

  lines.push('')
  lines.push('══════════════════════════════════════════════════')
  lines.push('         报告结束 - 岩层剖面填色工具 v1.0')
  lines.push('══════════════════════════════════════════════════')

  return lines.join('\n')
}

export function exportAsText(profile: StratumProfile, operations: OperationRecord[], filename?: string) {
  const content = generatePlainTextReport(profile, operations)
  const name = filename || `${profile.name || '岩层剖面复盘报告'}_${new Date().getTime()}.txt`
  downloadFile(name, content, 'text/plain;charset=utf-8')
}

export function exportAsJSON(profile: StratumProfile, operations: OperationRecord[], filename?: string) {
  const content = exportJSON(profile, operations)
  const name = filename || `${profile.name || '岩层剖面复盘数据'}_${new Date().getTime()}.json`
  downloadFile(name, content, 'application/json;charset=utf-8')
}
