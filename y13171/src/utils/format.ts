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
