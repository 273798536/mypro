import type {
  ExperimentRecord,
  SpectralData,
  SafetyNote,
  TemperatureCurve,
  TraceLog,
  RecordStatus,
  SafetyLevel,
} from '@/types'

export interface RecordSummary {
  recordId: string
  recordName: string
  status: RecordStatus
  type: string
  createdAt: string
  updatedAt: string
  spectralInfo?: { substanceName: string; hasOverlap: boolean; overlapCount: number }
  safetyNoteCount: number
  safetyNoteLevels: SafetyLevel[]
  temperatureAnomalyCount: number
  traceLogCount: number
}

export function buildRecordSummary(
  record: ExperimentRecord,
  spectralData: SpectralData[],
  safetyNotes: SafetyNote[],
  temperatureCurves: TemperatureCurve[],
  traceLogs: TraceLog[]
): RecordSummary {
  const recordSpectral = spectralData.find((s) => s.recordId === record.id)
  const recordSafetyNotes = safetyNotes.filter((n) => n.recordId === record.id)
  const recordTempCurves = temperatureCurves.filter((c) => c.recordId === record.id)
  const recordTraceLogs = traceLogs.filter((t) => t.recordId === record.id)

  const spectralInfo = recordSpectral
    ? {
        substanceName: recordSpectral.substanceName,
        hasOverlap: recordSpectral.hasOverlap,
        overlapCount: recordSpectral.overlapRegions.length,
      }
    : undefined

  const safetyNoteLevels = [...new Set(recordSafetyNotes.map((n) => n.level))]
  const temperatureAnomalyCount = recordTempCurves.reduce(
    (sum, c) => sum + c.anomalyRanges.length,
    0
  )

  return {
    recordId: record.id,
    recordName: record.name,
    status: record.status,
    type: record.type,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    spectralInfo,
    safetyNoteCount: recordSafetyNotes.length,
    safetyNoteLevels,
    temperatureAnomalyCount,
    traceLogCount: recordTraceLogs.length,
  }
}

export function buildAllSummary(
  records: ExperimentRecord[],
  spectralData: SpectralData[],
  safetyNotes: SafetyNote[],
  temperatureCurves: TemperatureCurve[],
  traceLogs: TraceLog[]
): {
  totalRecords: number
  passCount: number
  pendingCount: number
  failCount: number
  records: RecordSummary[]
} {
  const summaries = records.map((record) =>
    buildRecordSummary(record, spectralData, safetyNotes, temperatureCurves, traceLogs)
  )

  let passCount = 0
  let pendingCount = 0
  let failCount = 0

  for (const r of records) {
    if (r.status === 'pass') passCount++
    else if (r.status === 'pending') pendingCount++
    else if (r.status === 'fail') failCount++
  }

  return {
    totalRecords: records.length,
    passCount,
    pendingCount,
    failCount,
    records: summaries,
  }
}

export function downloadAsJSON(data: unknown, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadAsCSV(data: RecordSummary[], filename: string): void {
  if (data.length === 0) return

  const headers = [
    'recordId',
    'recordName',
    'status',
    'type',
    'createdAt',
    'updatedAt',
    'safetyNoteCount',
    'safetyNoteLevels',
    'temperatureAnomalyCount',
    'traceLogCount',
  ]

  const rows = data.map((item) =>
    [
      item.recordId,
      item.recordName,
      item.status,
      item.type,
      item.createdAt,
      item.updatedAt,
      item.safetyNoteCount,
      item.safetyNoteLevels.join(';'),
      item.temperatureAnomalyCount,
      item.traceLogCount,
    ]
      .map((val) => {
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      })
      .join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
