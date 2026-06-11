import type { CashFlowRecord, OperationLog, StoreMeta } from '@/types'

const K_RECORDS = 'abs-cashflow:records'
const K_LOGS = 'abs-cashflow:logs'
const K_META = 'abs-cashflow:meta'

export function loadRecords(): CashFlowRecord[] {
  try {
    const raw = localStorage.getItem(K_RECORDS)
    if (!raw) return []
    return JSON.parse(raw) as CashFlowRecord[]
  } catch {
    return []
  }
}

export function saveRecords(records: CashFlowRecord[]): void {
  localStorage.setItem(K_RECORDS, JSON.stringify(records))
}

export function loadLogs(): OperationLog[] {
  try {
    const raw = localStorage.getItem(K_LOGS)
    if (!raw) return []
    return JSON.parse(raw) as OperationLog[]
  } catch {
    return []
  }
}

export function saveLogs(logs: OperationLog[]): void {
  localStorage.setItem(K_LOGS, JSON.stringify(logs))
}

export function loadMeta(): StoreMeta {
  try {
    const raw = localStorage.getItem(K_META)
    if (!raw) return { importCounter: 0 }
    return JSON.parse(raw) as StoreMeta
  } catch {
    return { importCounter: 0 }
  }
}

export function saveMeta(meta: StoreMeta): void {
  localStorage.setItem(K_META, JSON.stringify(meta))
}

export function clearAll(): void {
  localStorage.removeItem(K_RECORDS)
  localStorage.removeItem(K_LOGS)
  localStorage.removeItem(K_META)
}
