export type Quality = 'normal' | 'edge' | 'bad'
export type BadType = 'none' | 'dirty_dup' | 'secure_misconfig'
export type SliceStatus = 'pass' | 'pending' | 'bad'

export interface ImportBatch {
  id: string
  batch_name: string
  source_path: string
  created_at: string
  status: string
}

export interface Slice {
  id: string
  import_id: string
  seg_list: string
  eval_bank: string
  content: string
  content_hash: string
  quality: Quality
  bad_type: BadType
  status: SliceStatus
  dup_of: string | null
  created_at: string
}

export interface ModelLog {
  id: string
  slice_id: string
  event: string
  message: string
  created_at: string
}

export interface Review {
  id: string
  round_name: string
  materials: string
  conclusion: string | null
  created_at: string
}

export interface OverviewStats {
  total: number
  pass: number
  pending: number
  bad: number
  badTypeCounts: Record<BadType, number>
  dedup: {
    dedupCount: number
    explainable: boolean
    detail: string
    pairs: { from: string; to: string }[]
  }
}

export interface TraceChain {
  record: { id: string; label: string; result: string }
  logs: ModelLog[]
  review: Review | null
  slice: Slice | null
  importBatch: ImportBatch | null
}

export interface ImportResult {
  imported: number
  duplicated: number
  conflicts: { incoming: string; existing: string }[]
  importId: string
}

export interface ExportPayload {
  generatedAt: string
  summary: OverviewStats
  records: Slice[]
}

export interface ReconcileItem {
  field: string
  uiValue: string | number
  fileValue: string | number
  match: boolean
}

export interface ReconcileResult {
  match: boolean
  items: ReconcileItem[]
}

export interface IoGuide {
  dependency: string
  startCommand: string
  clientPort: string
  serverPort: string
  firstSample: { path: string; importId: string; description: string }
  dbLocation: string
}
