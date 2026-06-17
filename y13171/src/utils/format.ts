import type { WarningRecord, RecordStatus, NoteSource } from '@/types'

export const STATUS_LABEL: Record<RecordStatus, string> = {
  normal: '正常',
  warning: '预警',
  suspended: '挂起待确认',
  confirmed: '已确认',
  rejected: '已驳回',
}

export const SOURCE_LABEL: Record<NoteSource, string> = {
  sensor: '传感器实测',
  manual: '人工录入',
  backfill: '补录自原始记录',
}

const FALLBACK_NUM = 0

export const safeNum = (v: number | null | undefined): number => {
  if (typeof v !== 'number' || Number.isNaN(v)) return FALLBACK_NUM
  return v
}

export const formatValue = (v: number) => {
  const n = safeNum(v)
  return `${n.toFixed(1)}mm`
}

export const formatTime = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const formatTimeForFilename = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

export const getSummaryText = (records: WarningRecord[]) => {
  const total = records.length
  const warningCount = records.filter((r) => r.status === 'warning').length
  const suspendedCount = records.filter((r) => r.status === 'suspended').length
  const confirmedCount = records.filter((r) => r.status === 'confirmed').length
  const lastModified = records.reduce(
    (max, r) => (r.lastModified && r.lastModified > max ? r.lastModified : max),
    ''
  )
  return { total, warningCount, suspendedCount, confirmedCount, lastModified }
}

export const getSceneDescription = (sceneLabel: string): string => {
  const label = sceneLabel?.trim() || '未设置场景标注'
  return `当前场景：${label}。该标注与卡片列表和页面摘要保持一致，源自同一条记录的场景标注字段。`
}

export const getPageSummaryPhrase = (records: WarningRecord[], selectedRecord: WarningRecord | null): string => {
  const { total, warningCount, suspendedCount } = getSummaryText(records)
  if (selectedRecord) {
    const mv = safeNum(selectedRecord.measuredValue)
    const th = safeNum(selectedRecord.threshold)
    const over = mv > th ? '超' : '未超'
    const scene = selectedRecord.sceneLabel?.trim() || '未设置场景标注'
    const tag = selectedRecord.sourceTag?.trim() || '来源未标注'
    return `共${total}条记录，${warningCount}条预警，${suspendedCount}条待确认；${scene}，实测${formatValue(mv)}${over}阈值${formatValue(th)}，来源：${tag}`
  }
  return `共${total}条记录，${warningCount}条预警，${suspendedCount}条待确认；点击左侧卡片查看具体场景。`
}

export const getSidePhrase = (sceneLabel: string): string => {
  return getSceneDescription(sceneLabel)
}

export const getCardPhrase = (sceneLabel: string): string => {
  return sceneLabel?.trim() || '未设置场景标注'
}

export const buildExportContent = (
  records: WarningRecord[], selectedRecord: WarningRecord | null
): { csv: string; json: string; summary: string } => {
  const summaryPhrase = getPageSummaryPhrase(records, selectedRecord)
  const scenePhrase = selectedRecord
    ? getSidePhrase(selectedRecord.sceneLabel)
    : '未选中具体记录'
  const cardPhrase = selectedRecord
    ? getCardPhrase(selectedRecord.sceneLabel)
    : '未选中具体记录'

  const consistentLabel = selectedRecord?.sceneLabel?.trim() || ''
  const passed = selectedRecord
    ? summaryPhrase.includes(consistentLabel) &&
      scenePhrase.includes(consistentLabel) &&
      cardPhrase === consistentLabel
    : false

  const csvHeader = [
    '设备编号',
    '实测值(mm)',
    '阈值(mm)',
    '状态',
    '场景标注',
    '维修备注',
    '数据来源',
    '是否补录',
    '原始事件时间',
    '记录时间',
    '最后修改',
  ].join(',')

  const csvRows = records.map((r) => {
    const mv = safeNum(r.measuredValue)
    const th = safeNum(r.threshold)
    const scene = (r.sceneLabel || '').replace(/"/g, '""')
    const note = (r.note || '').replace(/"/g, '""')
    const source = (r.sourceTag || '').replace(/"/g, '""')
    return [
      r.deviceId || '',
      mv.toFixed(1),
      th.toFixed(1),
      STATUS_LABEL[r.status] || r.status,
      `"${scene}"`,
      `"${note}"`,
      `"${source}"`,
      r.isBackfilled ? '是' : '否',
      r.originalTime ? formatTime(r.originalTime) : '',
      formatTime(r.recordTime),
      formatTime(r.lastModified),
    ].join(',')
  })

  const csvLines = [
    '# 梁体挠度阈值预警 - 数据导出',
    `# 导出时间: ${formatTime(new Date().toISOString())}`,
    `# 页面摘要: ${summaryPhrase}`,
    `# 侧边说明: ${scenePhrase}`,
    `# 卡片场景标注: ${cardPhrase}`,
    `# 三套话一致性校验: ${selectedRecord ? (passed ? '通过' : '不一致') : '未选中具体记录'}`,
    `# 记录总数: ${records.length}`,
    '#',
    csvHeader,
    ...csvRows,
  ]

  const csvContent = '\uFEFF' + csvLines.join('\n')

  const jsonContent = JSON.stringify({
    exportMeta: {
      exportTime: new Date().toISOString(),
      pageSummary: summaryPhrase,
      sideDescription: scenePhrase,
      cardSceneLabel: cardPhrase,
      consistencyCheck: selectedRecord
        ? {
            passed,
            sharedPhrase: consistentLabel,
            details: {
              pageSummaryContainsScene: summaryPhrase.includes(consistentLabel),
              sideDescriptionContainsScene: scenePhrase.includes(consistentLabel),
              cardLabelEqualsScene: cardPhrase === consistentLabel,
            },
          }
        : { passed: false, reason: '未选中具体记录' },
      recordCount: records.length,
    },
    records: records.map((r) => ({
      deviceId: r.deviceId,
      measuredValue: safeNum(r.measuredValue),
      threshold: safeNum(r.threshold),
      status: r.status,
      statusLabel: STATUS_LABEL[r.status] || r.status,
      sceneLabel: r.sceneLabel,
      note: r.note,
      noteSource: r.noteSource,
      sourceTag: r.sourceTag,
      isBackfilled: !!r.isBackfilled,
      originalTime: r.originalTime || null,
      recordTime: r.recordTime,
      lastModified: r.lastModified || r.recordTime,
      id: r.id,
    })),
  }, null, 2)

  return { csv: csvContent, json: jsonContent, summary: summaryPhrase }
}

export const downloadFile = (content: string, filename: string, mimeType: string): boolean => {
  if (typeof content !== 'string') {
    console.error('导出失败：内容格式错误')
    return false
  }
  if (!filename) {
    console.error('导出失败：文件名为空')
    return false
  }
  try {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch (e) {
    console.error('导出失败:', e)
    return false
  }
}
