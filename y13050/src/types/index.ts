export type PointStatus = 'normal' | 'overlap' | 'missing' | 'outlier' | 'dirty'
export type AnomalyType = 'overlap' | 'missing' | 'outlier' | 'dirty'
export type ReviewResult = 'pass' | 'supply' | 'pending'
export type PointType = '风速仪' | '风向标' | '温湿度' | '气压'

export interface CadLayer {
  id: string
  name: string
  sourceFile: string
  lineStart: number
  lineEnd: number
  visible: boolean
  color: string
}

export interface WindPoint {
  id: string
  layerId: string
  x: number
  y: number
  z: number
  type: PointType
  status: PointStatus
  cadLineNumber: number
  rawData: Record<string, any>
}

export interface Anomaly {
  id: string
  pointId: string
  type: AnomalyType
  description: string
  cadReference: string
  relatedPointIds: string[]
}

export interface ViewSnapshot {
  id: string
  name: string
  camera: { position: [number, number, number]; target: [number, number, number] }
  layers: Record<string, boolean>
  createdAt: string
}

export interface ReviewRecord {
  pointId: string
  result: ReviewResult
  remark: string
  updatedAt: string
}

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
}
