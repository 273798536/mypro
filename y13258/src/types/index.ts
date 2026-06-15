export interface Plan {
  id: string
  name: string
  school: string
  distance: number
  cost: number
  duration: number
  safetyLevel: 'A' | 'B' | 'C'
  coverage: number
  route: [number, number][]
  description: string
}

export interface ApprovalRecord {
  id: string
  planId: string
  planName: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  nextStep: string
  boundarySample?: BoundarySample
  supplementNotes: SupplementNote[]
  createdAt: string
  updatedAt: string
}

export interface BoundarySample {
  id: string
  originalCoord: [number, number]
  offsetCoord: [number, number]
  offsetDescription: string
  triggeredManualConfirm: boolean
}

export interface FieldPhoto {
  id: string
  planId: string
  coord: [number, number]
  offsetApplied: boolean
  offsetCoord?: [number, number]
  imageUrl: string
  description: string
  uploadedAt: string
}

export interface HistoryEntry {
  id: string
  planId: string
  planName: string
  type: 'filter_change' | 'manual_confirm' | 'field_supplement' | 'approval'
  before: Record<string, unknown>
  after: Record<string, unknown>
  description: string
  operator: string
  timestamp: string
}

export interface FilterState {
  distanceRange: [number, number]
  costRange: [number, number]
  durationRange: [number, number]
  safetyLevels: string[]
  coverageMin: number
}

export interface SupplementNote {
  id: string
  content: string
  author: string
  createdAt: string
}
