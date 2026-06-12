import type {
  AnomalyQueue,
  ComputeRecord,
  LogBatch,
  SensorRow,
} from '@/types'

function escapeCSV(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function formatTimestamp(ts: number | string | undefined | null): string {
  if (!ts) return '—'
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function formatTimeHM(ts: number | string | undefined | null): string {
  if (!ts) return '—'
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportCSV(
  batches: LogBatch[],
  rows: SensorRow[],
  computes: ComputeRecord[],
  anomalies: AnomalyQueue[],
): string {
  const headers = [
    'ID',
    '批次ID',
    '来源',
    '导入时间',
    '原始行',
    '时间戳',
    '方向',
    '混响值',
    '单位',
    '脏数据标记',
    '脏数据原因',
    '方向疑点',
    '方向影响范围',
    '方向已确认',
    '公式版本',
    '阈值',
    '阈值类型',
    '原始值',
    '计算结果',
    '判定等级',
    '计算状态',
    '失败分类',
    '失败说明',
    '改判原因',
    '改判说明',
    '改判人',
    '改判时间',
    '跳变原因',
    '跳变说明',
    '异常队列状态',
  ]

  const batchMap = new Map(batches.map((b) => [b.id, b]))
  const computeByRow = new Map(computes.map((c) => [c.rowId, c]))
  const anomalyByRow = new Map<string, AnomalyQueue[]>()
  for (const a of anomalies) {
    const arr = anomalyByRow.get(a.rowId) ?? []
    arr.push(a)
    anomalyByRow.set(a.rowId, arr)
  }
  const anomalyByCompute = new Map<string, AnomalyQueue[]>()
  for (const a of anomalies) {
    if (!a.computeId) continue
    const arr = anomalyByCompute.get(a.computeId) ?? []
    arr.push(a)
    anomalyByCompute.set(a.computeId, arr)
  }

  const lines: string[] = [headers.map(escapeCSV).join(',')]

  for (const row of rows) {
    const batch = batchMap.get(row.batchId)
    const comp = computeByRow.get(row.id)
    const alist = comp
      ? anomalyByCompute.get(comp.id) ?? anomalyByRow.get(row.id) ?? []
      : anomalyByRow.get(row.id) ?? []
    const statuses = alist.map((a) => a.status).join('|')

    lines.push(
      [
        row.id,
        row.batchId,
        batch?.source ?? '',
        batch ? formatTimestamp(batch.createdAt) : '',
        row.rawLine,
        formatTimestamp(row.timestamp),
        row.direction ?? '',
        row.reverb ?? '',
        row.unit ?? '',
        row.dirtyFlag ? '是' : '否',
        row.dirtyReasons.join('|'),
        row.directionSuspicious ? '可疑' : '',
        row.directionImpact ?? '',
        row.directionConfirmed ? '已确认' : row.directionIgnored ? '已忽略' : '',
        comp?.formulaVersion ?? '',
        comp?.threshold ?? '',
        comp?.thresholdType ?? '',
        isNaN(comp?.rawValue ?? NaN) ? '' : comp?.rawValue,
        isNaN(comp?.computedValue ?? NaN) ? '' : comp?.computedValue,
        comp?.result ?? '',
        comp?.status ?? '',
        comp?.failCategory ?? '',
        comp?.failNote ?? '',
        comp?.manualReason ?? '',
        comp?.manualNote ?? '',
        comp?.manualBy ?? '',
        comp?.manualAt ? formatTimestamp(comp.manualAt) : '',
        comp?.jumpCause ?? '',
        comp?.jumpNote ?? '',
        statuses,
      ]
        .map(escapeCSV)
        .join(','),
    )
  }

  return lines.join('\n')
}

export function exportJSON(
  batches: LogBatch[],
  rows: SensorRow[],
  computes: ComputeRecord[],
  anomalies: AnomalyQueue[],
): string {
  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    batches,
    rows,
    computes,
    anomalies,
  }
  return JSON.stringify(payload, null, 2)
}

export const exportCsv = exportCSV
export const exportJson = exportJSON
