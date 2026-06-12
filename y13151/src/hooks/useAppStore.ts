import { useStore } from '@/store'
import type {
  LogBatch,
  SensorRow,
  ComputeRecord,
  AnomalyQueue,
  ComputeConfig,
  ResultLevel,
  AnomalyType,
} from '@/types'

export { useStore }

export const useBatches = () => useStore((s) => s.batches)
export const useRows = () => useStore((s) => s.rows)
export const useComputes = () => useStore((s) => s.computes)
export const useAnomalies = () => useStore((s) => s.anomalies)
export const useConfig = () => useStore((s) => s.config)
export const useSelectedBatchId = () => useStore((s) => s.selectedBatchId)
export const useSelectedRowId = () => useStore((s) => s.selectedRowId)
export const useUINotes = () => useStore((s) => s.uiNotes)

export const useRowsByBatch = (batchId: string | null) => {
  const rows = useStore((s) => s.rows)
  if (!batchId) return rows
  return rows.filter((r) => r.batchId === batchId)
}

export const useComputeByRowId = (rowId: string) => {
  const computes = useStore((s) => s.computes)
  return computes.find((c) => c.rowId === rowId)
}

export const useAnomaliesByRowId = (rowId: string) => {
  const anomalies = useStore((s) => s.anomalies)
  return anomalies.filter((a) => a.rowId === rowId)
}

export const useAnomaliesByComputeId = (computeId: string) => {
  const anomalies = useStore((s) => s.anomalies)
  return anomalies.filter((a) => a.computeId === computeId)
}

export interface DashboardStats {
  totalRows: number
  pendingDirection: number
  anomalyQueue: number
  manualOverride: number
  resultDistribution: Record<ResultLevel, number>
  topAnomalies: AnomalyQueue[]
}

export const useDashboardStats = (): DashboardStats => {
  const rows = useStore((s) => s.rows)
  const computes = useStore((s) => s.computes)
  const anomalies = useStore((s) => s.anomalies)

  const pendingDirection = rows.filter((r) => r.directionSuspicious).length
  const anomalyQueue = anomalies.filter((a) => a.status === 'open').length
  const manualOverride = computes.filter((c) => c.status === 'manual').length

  const resultDistribution: Record<ResultLevel, number> = {
    normal: 0,
    warning: 0,
    critical: 0,
  }
  computes.forEach((c) => {
    resultDistribution[c.result]++
  })

  const topAnomalies = [...anomalies]
    .sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1)
      || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return {
    totalRows: rows.length,
    pendingDirection,
    anomalyQueue,
    manualOverride,
    resultDistribution,
    topAnomalies,
  }
}

export const useBatchStats = (batchId: string) => {
  const rows = useStore((s) => s.rows.filter((r) => r.batchId === batchId))
  const computes = useStore((s) => {
    const rowIds = new Set(rows.map((r) => r.id))
    return s.computes.filter((c) => rowIds.has(c.rowId))
  })
  return { rows, computes }
}

export const useActions = () => {
  return {
    setConfig: useStore((s) => s.setConfig),
    importBatch: useStore((s) => s.importBatch),
    confirmDirection: useStore((s) => s.confirmDirection),
    ignoreDirection: useStore((s) => s.ignoreDirection),
    runCompute: useStore((s) => s.runCompute),
    markFail: useStore((s) => s.markFail),
    manualOverride: useStore((s) => s.manualOverride),
    updateAnomalyStatus: useStore((s) => s.updateAnomalyStatus),
    updateAnomalyNote: useStore((s) => s.updateAnomalyNote),
    setRowNote: useStore((s) => s.setRowNote),
    setSelectedBatchId: useStore((s) => s.setSelectedBatchId),
    setSelectedRowId: useStore((s) => s.setSelectedRowId),
  }
}

export const useHasPendingDirection = (batchId: string | null) => {
  const rows = useStore((s) => s.rows)
  if (!batchId) return rows.some((r) => r.directionSuspicious)
  return rows.filter((r) => r.batchId === batchId).some((r) => r.directionSuspicious)
}

export const useAnomaliesFiltered = (
  filters: {
    batchId?: string | null
    resultLevel?: ResultLevel | 'all'
    anomalyStatus?: AnomalyQueue['status'] | 'all'
    keyword?: string
  } = {},
) => {
  const rows = useStore((s) => s.rows)
  const computes = useStore((s) => s.computes)
  const anomalies = useStore((s) => s.anomalies)

  let fRows = rows
  let fComputes = computes
  let fAnomalies = anomalies

  if (filters.batchId) {
    fRows = fRows.filter((r) => r.batchId === filters.batchId)
    const rowIds = new Set(fRows.map((r) => r.id))
    fComputes = fComputes.filter((c) => rowIds.has(c.rowId))
    fAnomalies = fAnomalies.filter((a) => rowIds.has(a.rowId))
  }

  if (filters.resultLevel && filters.resultLevel !== 'all') {
    const computeRowIds = new Set(
      fComputes.filter((c) => c.result === filters.resultLevel).map((c) => c.rowId),
    )
    fRows = fRows.filter((r) => computeRowIds.has(r.id))
    const rowIds = new Set(fRows.map((r) => r.id))
    fComputes = fComputes.filter((c) => rowIds.has(c.rowId))
    fAnomalies = fAnomalies.filter((a) => rowIds.has(a.rowId))
  }

  if (filters.anomalyStatus && filters.anomalyStatus !== 'all') {
    fAnomalies = fAnomalies.filter((a) => a.status === filters.anomalyStatus)
    const rowIds = new Set(fAnomalies.map((a) => a.rowId))
    fRows = fRows.filter((r) => rowIds.has(r.id))
    fComputes = fComputes.filter((c) => rowIds.has(c.rowId))
  }

  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    const matchRow = (r: SensorRow) =>
      r.id.toLowerCase().includes(kw)
      || r.rawLine.toLowerCase().includes(kw)
      || r.direction.toLowerCase().includes(kw)
    const matchAnomaly = (a: AnomalyQueue) =>
      a.reason.toLowerCase().includes(kw) || a.note.toLowerCase().includes(kw)
    const matchedRowIds = new Set<string>()
    fRows.filter(matchRow).forEach((r) => matchedRowIds.add(r.id))
    fAnomalies.filter(matchAnomaly).forEach((a) => matchedRowIds.add(a.rowId))
    if (matchedRowIds.size) {
      fRows = fRows.filter((r) => matchedRowIds.has(r.id))
      fComputes = fComputes.filter((c) => matchedRowIds.has(c.rowId))
      fAnomalies = fAnomalies.filter((a) => matchedRowIds.has(a.rowId))
    }
  }

  return { rows: fRows, computes: fComputes, anomalies: fAnomalies }
}
