export interface GisPoint {
  id: string
  name: string
  lng: number
  lat: number
  district: string
  street: string
  address: string
  type: 'street' | 'plaza' | 'pedestrian'
  capacity: number
  currentCapacity: number
  status: 'pending' | 'reviewing' | 'confirmed' | 'disputed'
  complaintCount: number
  duplicateComplaint: boolean
  lastComplaintDate: string
  createTime: string
  updateTime: string
}

export interface Material {
  id: string
  pointId: string
  type: 'gis' | 'name_mismatch' | 'supplement' | 'photo'
  name: string
  fileName: string
  description: string
  uploadTime: string
  uploader: string
  size: number
}

export interface ReviewRecord {
  id: string
  pointId: string
  version: number
  reviewer: string
  reviewTime: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'need_confirm'
  manualRemark: string
  oldOpinion: string
  capacitySuggestion: number
  actualCapacity: number
  confirmReason: string
  impactScope: string
  isLatest: boolean
  changes: ReviewChange[]
}

export interface ReviewChange {
  field: string
  oldValue: any
  newValue: any
  changeTime: string
  operator: string
}

export interface AbnormalQueue {
  id: string
  pointId: string
  pointName: string
  type: 'duplicate_complaint' | 'name_mismatch' | 'capacity_over' | 'photo_missing' | 'pending_confirm'
  level: 'high' | 'medium' | 'low'
  description: string
  status: 'pending' | 'processing' | 'resolved'
  createTime: string
  handler: string
  remark: string
}

export interface PhotoRecord {
  id: string
  pointId: string
  url: string
  uploader: string
  uploadTime: string
  description: string
  changeExplanation: string
  beforeState: string
  afterState: string
}

export interface HistoryRecord {
  id: string
  pointId: string
  operator: string
  operateType: 'create' | 'update' | 'confirm' | 'reject' | 'photo_upload' | 'remark_add'
  operateTime: string
  beforeSnapshot: any
  afterSnapshot: any
  diffFields: string[]
  remark: string
}

export interface FilterState {
  district: string
  status: string
  street: string
  pointType: string
  keyword: string
  onlyDuplicate: boolean
  onlyAbnormal: boolean
}

export interface ReviewStore {
  gisPoints: GisPoint[]
  selectedPointId: string | null
  filterState: FilterState
  reviewRecords: ReviewRecord[]
  abnormalQueues: AbnormalQueue[]
  materials: Material[]
  photoRecords: PhotoRecord[]
  historyRecords: HistoryRecord[]
}
