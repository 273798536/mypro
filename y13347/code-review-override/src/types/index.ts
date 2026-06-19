export type ReviewStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'suspended'
  | 'anomaly'
  | 'supplemented'

export type RecordType =
  | 'normal'
  | 'supplemented'
  | 'anomaly'

export interface RawDataRow {
  id: string
  rowNumber: number
  objectId: string
  objectName: string
  rawScore: number
  rawLabel: string
  sampleHash: string
  createdAt: string
}

export interface ThresholdConfig {
  id: string
  metricName: string
  currentValue: number
  baselineValue: number
  driftTolerance: number
  isDrifted: boolean
  updatedAt: string
  updatedBy: string
}

export interface HistoryEntry {
  id: string
  timestamp: string
  operator: string
  field: string
  oldValue: unknown
  newValue: unknown
  note?: string
  screenshotUrl?: string
}

export interface GrayBreakdown {
  sampleChangeDelta: number
  sampleChangeNote: string
  thresholdChangeDelta: number
  thresholdChangeNote: string
  manualOverrideDelta: number
  manualOverrideNote: string
  totalDelta: number
}

export interface ReviewRecord {
  id: string
  recordType: RecordType
  codeReviewId: string
  rawRows: RawDataRow[]
  algorithmMetric: number
  baselineMetric: number
  finalMetric: number
  status: ReviewStatus
  thresholdSnapshot: ThresholdConfig
  grayBreakdown?: GrayBreakdown
  history: HistoryEntry[]
  currentNote: string
  currentScreenshotUrl?: string
  assignedTo: string
  apiResponseSnapshot?: unknown
  createdAt: string
  updatedAt: string
  suspendedReason?: string
}

export interface AppState {
  records: ReviewRecord[]
  thresholds: ThresholdConfig[]
  currentUser: string
  lastSavedAt: string | null
}

export interface StoreActions {
  init: () => void
  resetToSeed: () => void
  updateRecordField: (
    recordId: string,
    field: keyof ReviewRecord,
    newValue: unknown,
    note?: string
  ) => void
  addHistoryEntry: (recordId: string, entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void
  changeRecordStatus: (recordId: string, status: ReviewStatus, note?: string) => void
  updateNote: (recordId: string, note: string) => void
  attachScreenshot: (recordId: string, url: string) => void
  confirmSuspended: (recordId: string, accept: boolean) => void
  recomputeGrayBreakdown: (
    recordId: string,
    params: { sampleChange: number; thresholdChange: number; manualOverride: number }
  ) => void
  addSupplementRecord: (baseRecordId: string, partialNote: string) => void
  setCurrentUser: (name: string) => void
  updateThreshold: (thresholdId: string, newValue: number) => void
}
