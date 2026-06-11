export type CollisionStatus = 'collision' | 'safe' | 'pending_review'
export type LabelType = 'resolved' | 'pending_material' | 'manual_override'
export type AnnotationType = 'review_note' | 'supplement' | 'action_hint'
export type ObjectType = 'bar' | 'fixture' | 'scenery'

export interface Bar {
  id: string
  name: string
  positionX: number
  positionY: number
  positionZ: number
  length: number
  type: ObjectType
}

export interface Fixture {
  id: string
  name: string
  barId: string
  offsetX: number
  offsetY: number
  offsetZ: number
  fixtureType: string
}

export interface Collision {
  id: string
  objectAId: string
  objectBId: string
  distance: number
  frameIndex: number
  status: CollisionStatus
}

export interface Annotation {
  id: string
  collisionId: string
  authorId: string
  authorName: string
  content: string
  batchNo: string
  timestamp: string
  type: AnnotationType
}

export interface SupplementMaterial {
  id: string
  annotationId: string
  batchNo: string
  content: string
  timestamp: string
  fileType: string
}

export interface ScreenshotMark {
  id: string
  collisionId: string
  objectId: string
  imageData: string
  label: string
  labelType: LabelType
  note: string
  timestamp: number
}

export interface BarFrame {
  barId: string
  frameIndex: number
  positionY: number
}

export interface AnnotationChain {
  collisionId: string
  annotations: Annotation[]
  supplements: SupplementMaterial[]
}

export interface FilterState {
  collisionStatus: CollisionStatus | 'all'
  objectType: ObjectType | 'all'
}
