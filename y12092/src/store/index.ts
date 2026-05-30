import { create } from 'zustand';
import type { Camera, Conflict, ConflictStatus, VenueObject, CameraHistory, MergeDecision, MergeRecord, CameraRoute, Annotation } from '@/types';
import { detectAllPositionConflicts } from '@/utils/conflict/position';
import { detectAllOcclusionConflicts } from '@/utils/conflict/occlusion';
import { detectAllBoundaryConflicts } from '@/utils/conflict/boundary';
import { mockCameras, mockCameraHistories, mockCameraRoutes, mockCamerasSourceA, mockCamerasSourceB } from '@/data/mockCameras';
import { mockVenueObjects, venueSize } from '@/data/mockVenue';
import { findMergeConflicts, mergeCameras } from '@/utils/dataMerge';

interface AppState {
  cameras: Camera[];
  venueObjects: VenueObject[];
  conflicts: Conflict[];
  cameraHistories: CameraHistory[];
  cameraRoutes: CameraRoute[];
  selectedCameraId: string | null;
  selectedConflictId: string | null;
  focusedCameraIds: string[];
  isDetectingConflicts: boolean;
  mergeSourceA: Camera[];
  mergeSourceB: Camera[];
  mergeDecisions: MergeDecision[];
  mergeRecords: MergeRecord[];
  annotations: Annotation[];
  showFrustums: boolean;
  showLabels: boolean;
  showRoutes: boolean;
  
  setSelectedCamera: (id: string | null) => void;
  setSelectedConflict: (id: string | null) => void;
  toggleFocusCamera: (id: string) => void;
  clearFocus: () => void;
  detectAllConflicts: () => Promise<void>;
  updateConflictStatus: (conflictId: string, status: ConflictStatus) => void;
  updateCamera: (cameraId: string, updates: Partial<Camera>) => void;
  addCameraHistory: (cameraId: string, fieldName: string, oldValue: string, newValue: string, operator: string) => void;
  loadMergeData: () => void;
  makeMergeDecision: (cameraId: string, fieldName: string, choice: 'a' | 'b' | 'both') => void;
  applyMerge: () => void;
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  setShowFrustums: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setShowRoutes: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  cameras: mockCameras,
  venueObjects: mockVenueObjects,
  conflicts: [],
  cameraHistories: mockCameraHistories,
  cameraRoutes: mockCameraRoutes,
  selectedCameraId: null,
  selectedConflictId: null,
  focusedCameraIds: [],
  isDetectingConflicts: false,
  mergeSourceA: [],
  mergeSourceB: [],
  mergeDecisions: [],
  mergeRecords: [],
  annotations: [],
  showFrustums: true,
  showLabels: true,
  showRoutes: true,
  
  setSelectedCamera: (id) => set({ selectedCameraId: id }),
  
  setSelectedConflict: (id) => {
    const state = get();
    const conflict = state.conflicts.find(c => c.id === id);
    if (conflict) {
      const focused = [conflict.cameraAId];
      if (conflict.cameraBId) focused.push(conflict.cameraBId);
      set({ 
        selectedConflictId: id,
        focusedCameraIds: focused,
        selectedCameraId: conflict.cameraAId,
      });
    } else {
      set({ selectedConflictId: id });
    }
  },
  
  toggleFocusCamera: (id) => set(state => ({
    focusedCameraIds: state.focusedCameraIds.includes(id)
      ? state.focusedCameraIds.filter(cid => cid !== id)
      : [...state.focusedCameraIds, id],
  })),
  
  clearFocus: () => set({ focusedCameraIds: [], selectedConflictId: null }),
  
  detectAllConflicts: async () => {
    set({ isDetectingConflicts: true });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const state = get();
    const venueBounds = {
      minX: -venueSize.width / 2,
      maxX: venueSize.width / 2,
      minY: 0,
      maxY: venueSize.height,
      minZ: -venueSize.depth / 2,
      maxZ: venueSize.depth / 2,
    };
    
    const positionConflicts = detectAllPositionConflicts(state.cameras);
    const occlusionConflicts = detectAllOcclusionConflicts(state.cameras, state.venueObjects);
    const boundaryConflicts = detectAllBoundaryConflicts(state.cameras, state.venueObjects, { venueBounds });
    
    const allConflicts = [...positionConflicts, ...occlusionConflicts, ...boundaryConflicts];
    
    allConflicts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    set({ 
      conflicts: allConflicts,
      isDetectingConflicts: false,
    });
  },
  
  updateConflictStatus: (conflictId, status) => set(state => ({
    conflicts: state.conflicts.map(c => 
      c.id === conflictId ? { ...c, status } : c
    ),
  })),
  
  updateCamera: (cameraId, updates) => {
    const state = get();
    const camera = state.cameras.find(c => c.id === cameraId);
    if (!camera) return;
    
    const updatedCamera = {
      ...camera,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    set(state => ({
      cameras: state.cameras.map(c => 
        c.id === cameraId ? updatedCamera : c
      ),
    }));
  },
  
  addCameraHistory: (cameraId, fieldName, oldValue, newValue, operator) => {
    const history: CameraHistory = {
      id: `hist-${Date.now()}`,
      cameraId,
      fieldName,
      oldValue,
      newValue,
      operator,
      changedAt: new Date().toISOString(),
    };
    
    set(state => ({
      cameraHistories: [...state.cameraHistories, history],
    }));
  },
  
  loadMergeData: () => {
    const sourceA = mockCamerasSourceA;
    const sourceB = mockCamerasSourceB;
    const conflicts = findMergeConflicts(sourceA, sourceB);
    
    set({
      mergeSourceA: sourceA,
      mergeSourceB: sourceB,
      mergeDecisions: [],
    });
  },
  
  makeMergeDecision: (cameraId, fieldName, choice) => {
    const state = get();
    const cameraA = state.mergeSourceA.find(c => c.id === cameraId);
    const cameraB = state.mergeSourceB.find(c => c.id === cameraId);
    if (!cameraA || !cameraB) return;
    
    const getValue = (cam: Camera, field: string) => {
      const [main, sub] = field.split('.');
      return sub ? String((cam as any)[main][sub]) : String((cam as any)[main]);
    };
    
    const existingIndex = state.mergeDecisions.findIndex(
      d => d.cameraId === cameraId && d.fieldName === fieldName
    );
    
    const decision: MergeDecision = {
      id: `decision-${Date.now()}`,
      cameraId,
      fieldName,
      choice,
      valueA: getValue(cameraA, fieldName),
      valueB: getValue(cameraB, fieldName),
      decidedAt: new Date().toISOString(),
    };
    
    set(state => {
      const newDecisions = [...state.mergeDecisions];
      if (existingIndex >= 0) {
        newDecisions[existingIndex] = decision;
      } else {
        newDecisions.push(decision);
      }
      return { mergeDecisions: newDecisions };
    });
  },
  
  applyMerge: () => {
    const state = get();
    const { cameras, mergeRecord } = mergeCameras(
      state.mergeSourceA,
      state.mergeSourceB,
      state.mergeDecisions
    );
    
    set(state => ({
      cameras,
      mergeRecords: [...state.mergeRecords, mergeRecord],
      mergeDecisions: [],
    }));
    
    get().detectAllConflicts();
  },
  
  addAnnotation: (annotation) => set(state => ({
    annotations: [...state.annotations, annotation],
  })),
  
  removeAnnotation: (id) => set(state => ({
    annotations: state.annotations.filter(a => a.id !== id),
  })),
  
  clearAnnotations: () => set({ annotations: [] }),
  
  setShowFrustums: (show) => set({ showFrustums: show }),
  setShowLabels: (show) => set({ showLabels: show }),
  setShowRoutes: (show) => set({ showRoutes: show }),
}));
