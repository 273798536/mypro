export interface ShareItem {
  name: string
  ratio: number
}

export interface RecognizedData {
  participants: string[]
  shares: ShareItem[]
  introType: string
}

export interface ManualAnnotation {
  overrideData: RecognizedData
  reason: string
  timestamp: string
}

export interface VersionSnapshot {
  versionId: string
  timestamp: string
  trigger: "initial_recognition" | "manual_annotation" | "rescan"
  data: RecognizedData
  annotationApplied: boolean
  notesIncluded: boolean
}

export type RecordStatus = "pending" | "recognized" | "anomaly" | "annotated"

export interface ScreenshotRecord {
  id: string
  fileName: string
  uploadTime: string
  status: RecordStatus
  recognizedData: RecognizedData | null
  manualAnnotation: ManualAnnotation | null
  rehearsalNote: string
  authorizationNote: string
  versions: VersionSnapshot[]
  isBoundarySample: boolean
}

export interface FilterCriteria {
  statuses: RecordStatus[]
  dateRange: { start: string; end: string } | null
  hasAnomaly: boolean | null
  hasManualAnnotation: boolean | null
}

export interface PageSummary {
  filterCriteriaText: string
  total: number
  anomaly: number
  annotated: number
  pending: number
}

export interface ExportPayload {
  exportTime: string
  filterCriteria: FilterCriteria
  filterCriteriaText: string
  summary: {
    total: number
    anomaly: number
    annotated: number
    pending: number
  }
  records: ScreenshotRecord[]
}

export const STATUS_LABELS: Record<RecordStatus, string> = {
  pending: "待处理",
  recognized: "已识别",
  anomaly: "异常",
  annotated: "已批注",
}
