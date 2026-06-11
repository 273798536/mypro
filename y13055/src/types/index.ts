export type AnomalyType = 'name_mismatch' | 'floor_unit_mix' | 'coordinate_offset' | 'none'

export type ReviewStatus = 'pending' | 'need_evidence' | 'reviewed'

export interface InspectionPhoto {
  id: string
  url: string
  name: string
  floorRaw: string
  floorNormalized: string
  coordinateX: number
  coordinateY: number
  coordinateSystem: 'A' | 'B'
  materialNameOnPhoto: string
  takenAt: string
}

export interface Material {
  id: string
  name: string
  code: string
  standardName: string
}

export interface ReviewRecord {
  id: string
  photoId: string
  materialId: string
  anomalyType: AnomalyType
  anomalyDescription: string
  status: ReviewStatus
  reviewNote: string
  evidenceUrl?: string
  updatedAt: string
}

export interface CaliberItem {
  label: string
  description: string
  reportText: string
}

export interface FilterState {
  floor: string
  anomalyType: AnomalyType | 'all'
  status: ReviewStatus | 'all'
  viewMode: 'plan' | 'list'
}
