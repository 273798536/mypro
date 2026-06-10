import {
  StandardBatch,
  SpectrumRecord,
  AnomalyRecord,
  ProcessRecord,
} from '../types'

export function buildPlainLanguageSummary(
  batch: StandardBatch,
  spectrums: SpectrumRecord[],
  anomalies: AnomalyRecord[],
): string {
  const lines: string[] = []
  lines.push(
    `【批次 ${batch.batchNo}】标准液「${batch.reagentName}」由 ${batch.preparator} 于 ${batch.preparationDate} 配制，标称浓度 ${batch.nominalConcentration} ${batch.nominalConcentrationUnit}，有效期至 ${batch.validUntilDate}。`,
  )
  if (batch.actualConcentration != null) {
    const diff = (
      ((batch.actualConcentration - batch.nominalConcentration) /
        batch.nominalConcentration) *
      100
    ).toFixed(2)
    lines.push(
      `实际测得浓度为 ${batch.actualConcentration} ${batch.nominalConcentrationUnit}，与标称值偏差 ${diff}%。`,
    )
    if (batch.concentrationErrorCause) {
      lines.push(`浓度偏差的原因：${batch.concentrationErrorCause}。`)
    }
  }
  if (spectrums.length === 0) {
    lines.push('本批次暂未导入谱图检测数据。')
  } else {
    const overlapCount = spectrums.filter((s) => s.hasOverlap).length
    const qualifiedCount = spectrums.filter(
      (s) => s.conclusion === 'qualified',
    ).length
    lines.push(
      `已完成 ${spectrums.length} 次谱图检测，其中谱峰重叠 ${overlapCount} 次，判定合格 ${qualifiedCount} 次。`,
    )
  }
  if (anomalies.length > 0) {
    const openCount = anomalies.filter((a) => a.status !== 'closed').length
    lines.push(
      `本批次共登记 ${anomalies.length} 条异常，其中未关闭 ${openCount} 条。`,
    )
  } else {
    lines.push('本批次暂无异常记录。')
  }
  return lines.join('')
}

export function buildValidityConclusion(
  batch: StandardBatch,
  spectrums: SpectrumRecord[],
  anomalies: AnomalyRecord[],
  today: string,
): 'valid' | 'invalid' | 'warning' {
  if (batch.status === 'expired' || batch.status === 'invalid') return 'invalid'
  if (today > batch.validUntilDate) return 'invalid'
  const hasOpenAnomaly = anomalies.some((a) => a.status !== 'closed')
  const hasOverlapSpectrum = spectrums.some((s) => s.hasOverlap)
  const hasUnqualified = spectrums.some((s) => s.conclusion === 'unqualified')
  if (hasOpenAnomaly || hasOverlapSpectrum || hasUnqualified) return 'warning'
  return 'valid'
}

export function buildExportText(
  batch: StandardBatch,
  spectrums: SpectrumRecord[],
  anomalies: AnomalyRecord[],
  processes: ProcessRecord[],
): string {
  const lines: string[] = []
  lines.push('========================================')
  lines.push('实验室标准液有效期检测报告')
  lines.push('========================================')
  lines.push('')
  lines.push('【一、标准液基本信息】')
  lines.push(`批次号：${batch.batchNo}`)
  lines.push(`试剂名称：${batch.reagentName}`)
  if (batch.reagentCasNo) lines.push(`CAS 编号：${batch.reagentCasNo}`)
  lines.push(`标称浓度：${batch.nominalConcentration} ${batch.nominalConcentrationUnit}`)
  if (batch.actualConcentration != null) {
    lines.push(`实际浓度：${batch.actualConcentration} ${batch.nominalConcentrationUnit}`)
  }
  if (batch.concentrationErrorCause) {
    lines.push(`浓度偏差原因：${batch.concentrationErrorCause}`)
  }
  lines.push(`配制日期：${batch.preparationDate}`)
  lines.push(`有效期至：${batch.validUntilDate}`)
  lines.push(`配制人：${batch.preparator}`)
  if (batch.auditor) lines.push(`复核人：${batch.auditor}`)
  lines.push('')
  lines.push('【二、谱图检测记录】')
  if (spectrums.length === 0) {
    lines.push('（暂无谱图数据）')
  } else {
    spectrums.forEach((s, idx) => {
      lines.push(`--- 第 ${idx + 1} 次检测 ---`)
      lines.push(`检测日期：${s.analysisDate}`)
      lines.push(`分析人员：${s.analyst}`)
      lines.push(`仪器：${s.instrumentName}（${s.instrumentNo}）`)
      lines.push(
        `结论：${
          s.conclusion === 'qualified'
            ? '合格'
            : s.conclusion === 'unqualified'
              ? '不合格'
              : '待判定'
        }`,
      )
      if (s.hasOverlap) {
        lines.push('谱峰重叠情况：')
        s.overlapDetails.forEach((d) => lines.push('  - ' + d))
      }
      lines.push('')
    })
  }
  lines.push('【三、异常记录与处理意见】')
  if (anomalies.length === 0) {
    lines.push('（暂无异常）')
  } else {
    anomalies.forEach((a, idx) => {
      lines.push(`--- 异常 ${idx + 1} ---`)
      lines.push(`类型：${anomalyTypeLabel(a.anomalyType)}`)
      lines.push(`严重程度：${severityLabel(a.severity)}`)
      lines.push(`标题：${a.title}`)
      lines.push(`详情：${a.detail}`)
      lines.push(`安全提示：${a.safetyHint}`)
      lines.push(`通俗解释：${a.plainLanguageExplanation}`)
      lines.push(
        `当前状态：${
          a.status === 'open'
            ? '待处理'
            : a.status === 'handling'
              ? '处理中'
              : a.status === 'resolved'
                ? '已解决'
                : '已关闭'
        }`,
      )
      if (a.handler) lines.push(`处理人：${a.handler}`)
      if (a.handlingOpinion) lines.push(`处理意见：${a.handlingOpinion}`)
      lines.push('')
    })
  }
  lines.push('【四、处理操作时间线（界面/报告共用）】')
  processes
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((p) => {
      lines.push(`[${p.createdAt}] ${p.operator} - ${operationLabel(p.operationType)}：${p.description}`)
      if (p.safetyHint) lines.push(`  安全提示：${p.safetyHint}`)
    })
  lines.push('')
  lines.push('========================================')
  lines.push('报告生成时间：' + new Date().toISOString().slice(0, 19).replace('T', ' '))
  return lines.join('\n')
}

export function anomalyTypeLabel(t: AnomalyRecord['anomalyType']): string {
  const map = {
    peak_overlap: '谱峰重叠',
    concentration_error: '浓度偏差',
    expired: '已过期',
    instrument_error: '仪器故障',
    operation_error: '操作失误',
    other: '其他异常',
  }
  return map[t]
}

export function severityLabel(s: AnomalyRecord['severity']): string {
  return s === 'high' ? '高' : s === 'medium' ? '中' : '低'
}

export function operationLabel(t: ProcessRecord['operationType']): string {
  const map = {
    create_batch: '创建批次',
    update_batch: '修改批次',
    import_spectrum: '导入谱图',
    dedupe_spectrum: '谱图去重',
    detect_overlap: '检测谱峰重叠',
    mark_anomaly: '登记异常',
    add_safety_hint: '追加安全提示',
    handle_anomaly: '处理异常',
    audit: '复核批次',
    export_report: '导出报告',
  }
  return map[t]
}
