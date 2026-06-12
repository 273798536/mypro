export type BarStatus = 'pending' | 'passed' | 'need-fix' | 'overlap'

export interface Bar {
  id: string
  name: string
  x: number
  y: number
  z: number
  length: number
  status: BarStatus
  commentIds: string[]
  coordinateSystem: 'stage-local'
  zone: string
  riskLevel?: RiskLevel
}

export type CommentStatus = '待复核' | '已通过' | '需修改'

export interface ReviewComment {
  id: string
  barId: string
  author: string
  content: string
  status: CommentStatus
  createdAt: number
  hasLateAttachment: boolean
  attachmentName?: string
}

export type RiskLevel = '高' | '中' | '低'

export interface OverlapPair {
  id: string
  barIdA: string
  barIdB: string
  overlapDistance: number
  riskLevel: RiskLevel
  detectedAt: number
}

export interface ModifyHistory {
  id: string
  commentId: string
  barId: string
  operator: string
  modifiedAt: number
  beforeValue: string
  afterValue: string
  reason: string
  field: 'status' | 'coordinate' | 'comment'
}

export interface Hotspot {
  barId: string
  x: number
  y: number
  width: number
  height: number
}

export interface FilterCriteria {
  status?: string[]
  zone?: string
  keyword?: string
  riskLevel?: string[]
  appliedAt: number
}

export interface ScreenshotRecord {
  id: string
  imageUrl: string
  capturedAt: number
  filterSnapshot: FilterCriteria
  linkedBarIds: string[]
  hotspotAreas: Hotspot[]
  title: string
}

export interface ExportResponse {
  code: number
  message: string
  data: {
    bars: Bar[]
    comments: ReviewComment[]
    overlapPairs: OverlapPair[]
    summary: {
      passed: number
      needFix: number
      overlap: number
      pending: number
    }
    filterCriteria: FilterCriteria
    exportAt: number
    coordinateSystem: string
  }
}

export interface ExportRequest {
  filter: FilterCriteria
  bars?: Bar[]
  comments?: ReviewComment[]
  overlapPairs?: OverlapPair[]
}

export interface SyncStatusRequest {
  commentId: string
  barId: string
  commentStatus: CommentStatus
  barStatus: BarStatus
  reason: string
  operator: string
}

export type FinalAction = 'pass' | '补材料' | '待定'

export interface FinalizationItem {
  barId: string
  barName: string
  action: FinalAction
  reason: string
}
