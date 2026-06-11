export interface Station {
  id: string
  name: string
  elevation: number
  lineName: string
}

export interface CoordSystem {
  id: string
  name: string
  type: string
  epsg: string
}

export interface Point {
  id: string
  stationId: string
  name: string
  x: number
  y: number
  z: number
  coordSystemId: string
  status: 'normal' | 'warning' | 'error'
}

export interface PointVersion {
  id: string
  pointId: string
  x: number
  y: number
  z: number
  coordSystemId: string
  changedBy: string
  changedAt: string
  reason: string
}

export interface Adjacency {
  id: string
  pointAId: string
  pointBId: string
  distance: number
  deviation: number
  mergeOk: boolean
}

export interface MergeIssue {
  id: string
  adjacencyId: string
  description: string
  actionStep: string
  status: 'open' | 'processing' | 'resolved'
}

export interface ReviewRound {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface Annotation {
  id: string
  roundId: string
  pointId: string
  content: string
  author: string
  createdAt: string
  version: number
}

export interface AnnotationNote {
  id: string
  annotationId: string
  content: string
  author: string
  createdAt: string
}

export interface ScreenshotArchive {
  id: string
  annotationId: string
  dataUrl: string
  description: string
  capturedAt: string
  version: number
}

export interface HandoverReport {
  id: string
  title: string
  createdAt: string
  status: 'draft' | 'final'
}

export interface HandoverItem {
  id: string
  reportId: string
  annotationId: string
  screenshotDataUrl: string
  description: string
  verificationStatus: 'pending' | 'verified' | 'supplement' | 'rejected'
  verifiedBy: string
  verifiedAt: string
}

export interface FilterState {
  coordSystemIds: string[]
  stationIds: string[]
  deviationRange: [number, number]
  statuses: ('normal' | 'warning' | 'error')[]
}
