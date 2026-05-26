import { create } from 'zustand';
import {
  PointCloudData,
  Annotation,
  DamageLevel,
  VersionRecord,
  ImportOptions,
  BoundingBox,
} from '../types';
import { generateId, checkOverlap } from '../utils/coordinateUtils';

interface AppState {
  pointclouds: PointCloudData[];
  activePointcloudId: string | null;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  damageLevelFilter: DamageLevel[];
  treeRowFilter: string | null;
  selectionMode: 'view' | 'box-select' | 'edit';
  cameraPosition: [number, number, number];
  versions: VersionRecord[];
  coordinateOffsetWarning: boolean;
  unsavedChanges: boolean;
  levelOverlapWarning: boolean;
  lastModifiedTime: Date | null;
  currentUser: string;

  importPointcloud: (data: PointCloudData, options?: ImportOptions) => void;
  setActivePointcloud: (id: string | null) => void;
  createAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAnnotation: (id: string, changes: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  setSelectedAnnotation: (id: string | null) => void;
  setDamageLevelFilter: (levels: DamageLevel[]) => void;
  setTreeRowFilter: (row: string | null) => void;
  setSelectionMode: (mode: 'view' | 'box-select' | 'edit') => void;
  setCameraPosition: (position: [number, number, number]) => void;
  saveVersion: (description: string) => void;
  restoreVersion: (versionId: string) => void;
  setCoordinateOffsetWarning: (value: boolean) => void;
  setUnsavedChanges: (value: boolean) => void;
  setLevelOverlapWarning: (value: boolean) => void;
  checkForOverlap: (box: BoundingBox, excludeId?: string) => boolean;
  clearAll: () => void;
  resetState: () => void;
}

const initialState = {
  pointclouds: [],
  activePointcloudId: null,
  annotations: [],
  selectedAnnotationId: null,
  damageLevelFilter: [],
  treeRowFilter: null,
  selectionMode: 'view' as const,
  cameraPosition: [50, 50, 50] as [number, number, number],
  versions: [],
  coordinateOffsetWarning: false,
  unsavedChanges: false,
  levelOverlapWarning: false,
  lastModifiedTime: null,
  currentUser: '查勘员001',
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  importPointcloud: (data, options = { mode: 'append' }) => {
    const current = get().pointclouds;
    const existing = current.find((pc) => pc.name === data.name);

    if (existing) {
      if (options.mode === 'ignore') {
        return;
      }
      if (options.mode === 'overwrite') {
        set({
          pointclouds: current.map((pc) => (pc.id === existing.id ? data : pc)),
          activePointcloudId: existing.id,
        });
        return;
      }
    }

    set({
      pointclouds: [...current, data],
      activePointcloudId: data.id,
      unsavedChanges: true,
      lastModifiedTime: new Date(),
    });
  },

  setActivePointcloud: (id) => {
    set({ activePointcloudId: id });
  },

  createAnnotation: (annotation) => {
    const hasOverlap = get().checkForOverlap(annotation.box);

    const newAnnotation: Annotation = {
      ...annotation,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set({
      annotations: [...get().annotations, newAnnotation],
      selectedAnnotationId: newAnnotation.id,
      unsavedChanges: true,
      lastModifiedTime: new Date(),
      levelOverlapWarning: hasOverlap,
    });
  },

  updateAnnotation: (id, changes) => {
    const annotations = get().annotations;
    const annotation = annotations.find((a) => a.id === id);

    if (!annotation) return;

    if (changes.box) {
      const hasOverlap = get().checkForOverlap(changes.box, id);
      set({ levelOverlapWarning: hasOverlap });
    }

    set({
      annotations: annotations.map((a) =>
        a.id === id ? { ...a, ...changes, updatedAt: new Date() } : a
      ),
      unsavedChanges: true,
      lastModifiedTime: new Date(),
    });
  },

  deleteAnnotation: (id) => {
    set({
      annotations: get().annotations.filter((a) => a.id !== id),
      selectedAnnotationId:
        get().selectedAnnotationId === id ? null : get().selectedAnnotationId,
      unsavedChanges: true,
      lastModifiedTime: new Date(),
    });
  },

  setSelectedAnnotation: (id) => {
    set({ selectedAnnotationId: id });
  },

  setDamageLevelFilter: (levels) => {
    set({ damageLevelFilter: levels });
  },

  setTreeRowFilter: (row) => {
    set({ treeRowFilter: row });
  },

  setSelectionMode: (mode) => {
    set({ selectionMode: mode });
  },

  setCameraPosition: (position) => {
    set({ cameraPosition: position });
  },

  saveVersion: (description) => {
    const { annotations, pointclouds, currentUser } = get();
    const newVersion: VersionRecord = {
      id: generateId(),
      timestamp: new Date(),
      description,
      annotations: JSON.parse(JSON.stringify(annotations)),
      pointclouds: JSON.parse(JSON.stringify(pointclouds)),
      author: currentUser,
    };

    set({
      versions: [newVersion, ...get().versions],
      unsavedChanges: false,
      lastModifiedTime: null,
    });
  },

  restoreVersion: (versionId) => {
    const version = get().versions.find((v) => v.id === versionId);
    if (!version) return;

    set({
      annotations: JSON.parse(JSON.stringify(version.annotations)),
      pointclouds: JSON.parse(JSON.stringify(version.pointclouds)),
      unsavedChanges: true,
      lastModifiedTime: new Date(),
    });
  },

  setCoordinateOffsetWarning: (value) => {
    set({ coordinateOffsetWarning: value });
  },

  setUnsavedChanges: (value) => {
    set({ unsavedChanges: value, lastModifiedTime: value ? new Date() : null });
  },

  setLevelOverlapWarning: (value) => {
    set({ levelOverlapWarning: value });
  },

  checkForOverlap: (box, excludeId?) => {
    const annotations = get().annotations;
    for (const annotation of annotations) {
      if (excludeId && annotation.id === excludeId) continue;
      const result = checkOverlap(box, annotation.box);
      if (result.hasOverlap) {
        return true;
      }
    }
    return false;
  },

  clearAll: () => {
    set({
      annotations: [],
      selectedAnnotationId: null,
      unsavedChanges: true,
      lastModifiedTime: new Date(),
    });
  },

  resetState: () => {
    set({ ...initialState });
  },
}));
