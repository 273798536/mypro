import { generateId, ID_PREFIXES } from '../utils/id';
import type {
  Annotation,
  CreateAnnotationParams,
  ProcessNote,
  AnnotationType,
  AnnotationStatus,
} from '../types/annotation';

export class AnnotationManager {
  private annotations: Map<string, Annotation> = new Map();

  createAnnotation(params: CreateAnnotationParams): Annotation {
    const now = Date.now();
    const annotation: Annotation = {
      id: generateId(ID_PREFIXES.ANNOTATION),
      levelId: params.levelId,
      snapshotId: params.snapshotId,
      timePoint: params.timePoint,
      ballId: params.ballId,
      ballPosition: params.ballPosition,
      type: params.type,
      content: params.content,
      status: params.status || 'draft',
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
      processNotes: [],
    };

    this.annotations.set(annotation.id, annotation);
    return annotation;
  }

  updateAnnotation(id: string, updates: Partial<Annotation>): Annotation {
    const annotation = this.annotations.get(id);
    if (!annotation) {
      throw new Error(`Annotation ${id} not found`);
    }

    const updated: Annotation = {
      ...annotation,
      ...updates,
      updatedAt: Date.now(),
    };

    this.annotations.set(id, updated);
    return updated;
  }

  deleteAnnotation(id: string): void {
    this.annotations.delete(id);
  }

  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  getAnnotationsByLevel(levelId: string): Annotation[] {
    return Array.from(this.annotations.values())
      .filter(a => a.levelId === levelId)
      .sort((a, b) => a.timePoint - b.timePoint);
  }

  addProcessNote(annotationId: string, content: string, author: string): ProcessNote {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      throw new Error(`Annotation ${annotationId} not found`);
    }

    const note: ProcessNote = {
      id: generateId(ID_PREFIXES.PROCESS_NOTE),
      annotationId,
      content,
      author,
      createdAt: Date.now(),
    };

    annotation.processNotes.push(note);
    annotation.updatedAt = Date.now();
    return note;
  }

  markAsAnomaly(annotationId: string, type: AnnotationType, description: string): Annotation {
    return this.updateAnnotation(annotationId, {
      type,
      content: description,
    });
  }

  updateStatus(annotationId: string, status: AnnotationStatus): Annotation {
    return this.updateAnnotation(annotationId, { status });
  }

  linkToSnapshot(annotationId: string, snapshotId: string): Annotation {
    return this.updateAnnotation(annotationId, { snapshotId });
  }

  getAnnotationsByType(levelId: string, type: AnnotationType): Annotation[] {
    return this.getAnnotationsByLevel(levelId).filter(a => a.type === type);
  }

  getAnnotationsByStatus(levelId: string, status: AnnotationStatus): Annotation[] {
    return this.getAnnotationsByLevel(levelId).filter(a => a.status === status);
  }

  clearLevelAnnotations(levelId: string): void {
    for (const [id, annotation] of this.annotations) {
      if (annotation.levelId === levelId) {
        this.annotations.delete(id);
      }
    }
  }

  getAllAnnotations(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  importAnnotations(annotations: Annotation[]): void {
    for (const annotation of annotations) {
      this.annotations.set(annotation.id, annotation);
    }
  }
}
