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

export const formatValue = (v: number) => `${v.toFixed(1)}mm`

export const formatTime = (iso: string) => {
  const d = new Date(iso)
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
    (max, r) => (r.lastModified > max ? r.lastModified : max),
    ''
  )
  return { total, warningCount, suspendedCount, confirmedCount, lastModified }
}

export const getSceneDescription = (sceneLabel: string): string => {
  return `当前场景：${sceneLabel}。该标注与卡片列表和页面摘要保持一致，源自同一条记录的场景标注字段。`
}

export const getPageSummaryPhrase = (records: WarningRecord[], selectedRecord: WarningRecord | null): string => {
  const { total, warningCount, suspendedCount } = getSummaryText(records)
  if (selectedRecord) {
    const over = selectedRecord.measuredValue > selectedRecord.threshold ? '超' : '未超'
    return `共${total}条记录，${warningCount}条预警，${suspendedCount}条待确认；${selectedRecord.sceneLabel}，实测${formatValue(selectedRecord.measuredValue)}${over}阈值${formatValue(selectedRecord.threshold)}，来源：${selectedRecord.sourceTag}`
  }
  return `共${total}条记录，${warningCount}条预警，${suspendedCount}条待确认；点击左侧卡片查看具体场景。`
}

export const getSidePhrase = (sceneLabel: string): string => {
  return `当前场景：${sceneLabel}。该标注与卡片列表和页面摘要保持一致，源自同一条记录的场景标注字段。`
}

export const getCardPhrase = (sceneLabel: string): string => {
  return sceneLabel
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

  const csvRows = records.map((r) => [
    r.deviceId,
    r.measuredValue.toFixed(1),
    r.threshold.toFixed(1),
    STATUS_LABEL[r.status],
    r.sceneLabel,
    `"${r.note.replace(/"/g, '""')}"`,
    r.sourceTag,
    r.isBackfilled ? '是' : '否',
    r.originalTime ? formatTime(r.originalTime) : '',
    formatTime(r.recordTime),
  ].join(','))

  const csvContent = [
    '# 梁体挠度阈值预警 - 数据导出',
    `# 导出时间: ${formatTime(new Date().toISOString())}`,
    `# 页面摘要: ${summaryPhrase}`,
    `# 侧边说明: ${scenePhrase}`,
    `# 卡片场景标注: ${cardPhrase}`,
    `# 三套话一致性校验: ${selectedRecord ? (summaryPhrase.includes(selectedRecord.sceneLabel) && scenePhrase.includes(selectedRecord.sceneLabel) && cardPhrase === selectedRecord.sceneLabel ? '通过' : '不一致') : '未选中具体记录'}`,
    '#',
    csvHeader,
    ...csvRows,
  ].join('\n')

  const jsonContent = JSON.stringify({
    exportMeta: {
      exportTime: new Date().toISOString(),
      pageSummary: summaryPhrase,
      sideDescription: scenePhrase,
      cardSceneLabel: cardPhrase,
      consistencyCheck: selectedRecord
        ? {
            passed: summaryPhrase.includes(selectedRecord.sceneLabel) &&
                    scenePhrase.includes(selectedRecord.sceneLabel) &&
                    cardPhrase === selectedRecord.sceneLabel,
            sharedPhrase: selectedRecord.sceneLabel,
          }
        : { passed: false, reason: '未选中具体记录' },
    },
    records: records.map((r) => ({
      deviceId: r.deviceId,
      measuredValue: r.measuredValue,
      threshold: r.threshold,
      status: r.status,
      statusLabel: STATUS_LABEL[r.status],
      sceneLabel: r.sceneLabel,
      note: r.note,
      noteSource: r.noteSource,
      sourceTag: r.sourceTag,
      isBackfilled: r.isBackfilled,
      originalTime: r.originalTime,
      recordTime: r.recordTime,
      lastModified: r.lastModified,
      id: r.id,
    })),
  }, null, 2)

  return { csv: csvContent, json: jsonContent, summary: summaryPhrase }
}

export const downloadFile = (content: string, filename: string, mimeType: string): boolean => {
  try {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (e) {
    console.error('导出失败:', e)
    return false
  }
}
