export type ComplaintStatus = 'pending' | 'rejected' | 'reviewing' | 'supplemented'

export interface Complaint {
  id: string
  title: string
  address: string
  lat: number
  lng: number
  status: ComplaintStatus
  isDuplicate: boolean
  isAbnormal: boolean
  createdAt: string
  supplementNote?: string
  originalLat?: number
  originalLng?: number
}

export interface Material {
  id: string
  complaintId: string
  name: string
  originalName: string
  source: string
  caliber: string
  originalCaliber: string
  caliberChanged: boolean
  changedAt: string
  changedBy: string
  oralNote?: string
}

export interface ApprovalRecord {
  id: string
  complaintId: string
  stage: string
  operator: string
  note: string
  createdAt: string
}

export interface ApiLog {
  id: string
  complaintId: string
  requestParams: Record<string, unknown>
  responseData: Record<string, unknown>
  runAt: string
  isRerun: boolean
}

export interface Photo {
  id: string
  complaintId: string
  url: string
  uploadedAt: string
  lat: number
  lng: number
  note: string
}

export interface TrendPoint {
  date: string
  count: number
  isAbnormal: boolean
}
