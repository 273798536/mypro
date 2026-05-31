export type VerifyStatus = 'pending' | 'verifying' | 'toReview' | 'passed' | 'rejected'

export type IssueType = 'breakpoint' | 'duplicate' | 'missing_signature' | 'area_mismatch'

export type IssueSeverity = 'low' | 'medium' | 'high'

export interface Farmer {
  id: string
  batchId: string
  idCard: string
  name: string
  village: string
  phone: string
  createdAt: string
}

export interface AreaDeclaration {
  id: string
  batchId: string
  farmerId: string
  plotNo: string
  declaredArea: number
  cropType: string
  declareDate: string
  signatureStatus: string
  createdAt: string
}

export interface TrackRecord {
  id: string
  batchId: string
  farmerId: string
  trackArea: number
  trackPointCount: number
  hasBreakpoint: boolean
  breakpointDetail: string
  trackDate: string
  createdAt: string
}

export interface SubsidyRule {
  id: string
  batchId: string
  cropType: string
  subsidyPerMu: number
  year: number
  createdAt: string
}

export interface VerificationRecord {
  id: string
  farmerId: string
  areaId: string
  trackId: string
  farmerName: string
  plotNo: string
  declaredArea: number
  trackArea: number
  verifiedArea: number
  status: VerifyStatus
  hasIssues: boolean
  issues: IssueMark[]
  cropType: string
  createdAt: string
  updatedAt: string
}

export interface IssueMark {
  id: string
  recordId: string
  type: IssueType
  description: string
  severity: IssueSeverity
  markedBy: string
  createdAt: string
}

export interface StatusHistory {
  id: string
  recordId: string
  fromStatus: VerifyStatus
  toStatus: VerifyStatus
  operator: string
  remark: string
  createdAt: string
}

export interface ReviewResult {
  id: string
  recordId: string
  conclusion: 'passed' | 'rejected'
  reviewer: string
  opinion: string
  reviewedAt: string
}

export interface ImportBatch {
  id: string
  type: 'farmer' | 'area' | 'track' | 'rule'
  filename: string
  uploadedBy: string
  uploadedAt: string
  recordCount: number
  status: 'processing' | 'completed' | 'failed'
}

export interface VerifyStats {
  total: number
  passed: number
  rejected: number
  pending: number
  verifying: number
  toReview: number
  issues: number
  issueDistribution: {
    breakpoint: number
    duplicate: number
    missing_signature: number
    area_mismatch: number
  }
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface VerifyListParams {
  page?: number
  pageSize?: number
  status?: VerifyStatus
  issueType?: IssueType
  keyword?: string
}

export interface ReviewListParams {
  page?: number
  pageSize?: number
  keyword?: string
}

export interface ReviewSubmitData {
  conclusion: 'passed' | 'rejected'
  opinion: string
}
