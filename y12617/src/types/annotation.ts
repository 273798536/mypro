import type { Vector2 } from './physics';

export type AnnotationType =
  | 'boundary_error'
  | 'collision_miss'
  | 'missing_unit'
  | 'duplicate'
  | 'normal'
  | 'other';

export type AnnotationStatus = 'draft' | 'confirmed' | 'pending_review' | 'merged';

export interface ProcessNote {
  id: string;
  annotationId: string;
  content: string;
  author: string;
  createdAt: number;
}

export interface Annotation {
  id: string;
  levelId: string;
  snapshotId: string;
  timePoint: number;
  ballId: string;
  ballPosition: Vector2;
  type: AnnotationType;
  content: string;
  status: AnnotationStatus;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  processNotes: ProcessNote[];
}

export interface CreateAnnotationParams {
  levelId: string;
  snapshotId: string;
  timePoint: number;
  ballId: string;
  ballPosition: Vector2;
  type: AnnotationType;
  content: string;
  status?: AnnotationStatus;
  createdBy: string;
}

export interface SaveAnnotationParams extends CreateAnnotationParams {
  processNote?: string;
}
