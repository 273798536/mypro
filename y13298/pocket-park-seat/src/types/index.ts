export type RecordStatus = 'pending' | 'confirmed' | 'withdrawn' | 'need_material' | 'manual_review'

export interface GisPoint {
  id: string
  name: string
  street: string
  lng: number
  lat: number
}

export interface SeatRecord {
  id: string
  gisPoint: GisPoint
  scheme: string
  schemeVersion: number
  status: RecordStatus
  importTime: string
  confirmTime?: string
  conclusion?: string
  conclusionTime?: string
  complaints: Complaint[]
  needMerge?: boolean
  conflictInfo?: ConflictInfo
  history: HistoryItem[]
  materials: string[]
  operator?: string
}

export interface Complaint {
  id: string
  content: string
  reporter: string
  time: string
  street: string
  merged?: boolean
  mergedFrom?: string[]
}

export interface ConflictInfo {
  type: 'old_covers_new' | 'duplicate_street'
  reason: string
  affectedRange: string
  needsConfirmation: boolean
}

export interface HistoryItem {
  id: string
  action: 'import' | 'confirm' | 'withdraw' | 'conclude' | 'update_scheme' | 'merge' | 'add_material'
  time: string
  operator: string
  remark: string
}

export interface ImportResult {
  success: SeatRecord[]
  warnings: ImportWarning[]
  errors: string[]
}

export interface ImportWarning {
  type: 'conflict' | 'duplicate' | 'need_material'
  recordId: string
  message: string
}
