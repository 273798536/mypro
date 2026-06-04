import { create } from 'zustand';
import { AnnotationManager } from '../services/AnnotationManager';
import { getMockAnnotationsForLevel } from '../data/mockData';
import type { Vector2 } from '../types/physics';
import type {
  Annotation,
  AnnotationType,
  AnnotationStatus,
  SaveAnnotationParams,
  ProcessNote,
} from '../types/annotation';

interface AnnotationState {
  manager: AnnotationManager;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  isAnnotating: boolean;
  annotatingBallId: string | null;
  annotatingPosition: Vector2 | null;
  draftContent: string;
  draftType: AnnotationType;
  currentUser: string;
}

interface AnnotationActions {
  loadMockAnnotations: (levelId: string) => void;
  startAnnotation: (ballId: string, position: Vector2) => void;
  cancelAnnotation: () => void;
  setDraftContent: (content: string) => void;
  setDraftType: (type: AnnotationType) => void;
  saveAnnotation: (params: Omit<SaveAnnotationParams, 'createdBy' | 'snapshotId' | 'timePoint' | 'ballId' | 'ballPosition'> & {
    levelId: string;
    snapshotId: string;
    timePoint: number;
  }) => Annotation;
  selectAnnotation: (id: string | null) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => Annotation;
  deleteAnnotation: (id: string) => void;
  updateStatus: (id: string, status: AnnotationStatus) => Annotation;
  addProcessNote: (annotationId: string, content: string) => ProcessNote;
  clearLevelAnnotations: (levelId: string) => void;
  setCurrentUser: (user: string) => void;
  getAnnotationById: (id: string) => Annotation | undefined;
  getAnnotationsByLevel: (levelId: string) => Annotation[];
}

export type AnnotationStore = AnnotationState & AnnotationActions;

const initialManager = new AnnotationManager();

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  manager: initialManager,
  annotations: [],
  selectedAnnotationId: null,
  isAnnotating: false,
  annotatingBallId: null,
  annotatingPosition: null,
  draftContent: '',
  draftType: 'normal',
  currentUser: '当前用户',

  loadMockAnnotations: (levelId) => {
    const mockAnnotations = getMockAnnotationsForLevel(levelId);
    const { manager } = get();
    manager.importAnnotations(mockAnnotations);
    set({
      annotations: manager.getAnnotationsByLevel(levelId),
    });
  },

  startAnnotation: (ballId, position) => {
    set({
      isAnnotating: true,
      annotatingBallId: ballId,
      annotatingPosition: position,
      draftContent: '',
      draftType: 'normal',
    });
  },

  cancelAnnotation: () => {
    set({
      isAnnotating: false,
      annotatingBallId: null,
      annotatingPosition: null,
      draftContent: '',
      draftType: 'normal',
    });
  },

  setDraftContent: (content) => set({ draftContent: content }),
  setDraftType: (type) => set({ draftType: type }),

  saveAnnotation: (params) => {
    const { manager, annotatingBallId, annotatingPosition, currentUser, annotations } = get();
    
    if (!annotatingBallId || !annotatingPosition) {
      throw new Error('No annotation in progress');
    }

    const annotation = manager.createAnnotation({
      ...params,
      ballId: annotatingBallId,
      ballPosition: annotatingPosition,
      createdBy: currentUser,
    });

    set({
      annotations: [...annotations, annotation],
      isAnnotating: false,
      annotatingBallId: null,
      annotatingPosition: null,
      draftContent: '',
      draftType: 'normal',
    });

    return annotation;
  },

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  updateAnnotation: (id, updates) => {
    const { manager, annotations } = get();
    const updated = manager.updateAnnotation(id, updates);
    set({
      annotations: annotations.map(a => a.id === id ? updated : a),
    });
    return updated;
  },

  deleteAnnotation: (id) => {
    const { manager, annotations } = get();
    manager.deleteAnnotation(id);
    set({
      annotations: annotations.filter(a => a.id !== id),
      selectedAnnotationId: null,
    });
  },

  updateStatus: (id, status) => {
    const { manager, annotations } = get();
    const updated = manager.updateStatus(id, status);
    set({
      annotations: annotations.map(a => a.id === id ? updated : a),
    });
    return updated;
  },

  addProcessNote: (annotationId, content) => {
    const { manager, currentUser, annotations } = get();
    const note = manager.addProcessNote(annotationId, content, currentUser);
    const updated = manager.getAnnotation(annotationId);
    if (updated) {
      set({
        annotations: annotations.map(a => a.id === annotationId ? updated : a),
      });
    }
    return note;
  },

  clearLevelAnnotations: (levelId) => {
    const { manager, annotations } = get();
    manager.clearLevelAnnotations(levelId);
    set({
      annotations: annotations.filter(a => a.levelId !== levelId),
      selectedAnnotationId: null,
    });
  },

  setCurrentUser: (user) => set({ currentUser: user }),

  getAnnotationById: (id) => get().manager.getAnnotation(id),

  getAnnotationsByLevel: (levelId) => get().manager.getAnnotationsByLevel(levelId),
}));
