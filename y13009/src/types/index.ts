export type RecordStatus = 'pending' | 'confirmed' | 'withdrawn' | 'reversal'

export interface CashFlowRecord {
  id: string
  batchNo: string
  amount: number
  status: RecordStatus
  baseStatus: 'pending' | 'confirmed' | 'withdrawn'
  source: string
  note: string
  importBatch: string
  importedAt: string
  confirmedAt?: string
  withdrawnAt?: string
  version: number
  isReversal: boolean
}

export type LogType = 'import' | 'confirm' | 'withdraw' | 'note_edit' | 'report_export' | 'rerun' | 'import_skip'

export interface OperationLog {
  id: string
  type: LogType
  recordId?: string
  detail: string
  operator: string
  timestamp: string
}

export interface StoreMeta {
  lastReportAt?: string
  importCounter: number
}

export interface ImportResultItem {
  batchNo: string
  amount: number
  source: string
}

export interface ImportPreview {
  newItems: ImportResultItem[]
  duplicates: Array<{ existing: CashFlowRecord; incoming: ImportResultItem; amountChanged: boolean }>
  reversals: ImportResultItem[]
}
