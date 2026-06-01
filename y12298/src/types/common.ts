import type { Vec3 } from './corridor'

export type ForbiddenLevel = 'critical' | 'warning' | 'caution'

export interface ForbiddenZone {
  id: string
  name: string
  description: string
  boundary: Vec3[]
  color: string
  level: ForbiddenLevel
  effectiveFrom: string
  effectiveTo?: string
  workOrderId?: string
}

export type AnnotationType = 'text' | 'arrow' | 'measure' | 'circle' | 'rectangle'

export interface Annotation {
  id: string
  type: AnnotationType
  position: Vec3
  content: string
  color: string
  author: string
  createdAt: string
  relatedRouteId?: string
  relatedValveId?: string
  relatedConflictId?: string
}
