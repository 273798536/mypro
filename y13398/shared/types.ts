export type ChangeType = 'sample' | 'threshold' | 'manual' | 'metric'
export type RecordStatus = 'processed' | 'pending' | 'anomalous'

export interface DashboardRecord {
  id: string
  source: string
  originalValue: string | null
  currentValue: string
  changeType: ChangeType
  status: RecordStatus
  isContaminated: boolean
  contaminationNote: string | null
  nextSteps: string[] | null
  rawLogRef: string | null
  version: string
  createdAt: string
}

export interface DashboardSummary {
  total: number
  processed: number
  pendingEvidence: number
  anomalous: number
  trend: Array<{ date: string; cost: number }>
  alerts: Array<DashboardRecord>
}

export interface VersionInfo {
  version: string
  label: string
  createdAt: string
  recordCount: number
}

export interface DiffItem {
  id: string
  field: string
  fromValue: string | null
  toValue: string | null
  changeType: 'added' | 'removed' | 'modified'
}

export interface VersionCompareResult {
  from: VersionInfo
  to: VersionInfo
  diff: {
    sample: DiffItem[]
    threshold: DiffItem[]
    manual: DiffItem[]
    metric: DiffItem[]
  }
  summary: { added: number; removed: number; modified: number; total: number }
}
