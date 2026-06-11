import { create } from 'zustand';
import type {
  AnomalyType,
  CollisionStatus,
  CameraAngle,
} from '../../shared/types';

interface AppState {
  anomalyTypes: AnomalyType[];
  statusFilter: CollisionStatus[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  cameraAngle: CameraAngle;
  currentOperator: string;
  setAnomalyTypes: (v: AnomalyType[]) => void;
  setStatusFilter: (v: CollisionStatus[]) => void;
  setSortBy: (v: string) => void;
  setSortOrder: (v: 'asc' | 'desc') => void;
  setCameraAngle: (v: CameraAngle) => void;
  applyView: (view: {
    anomalyTypes: AnomalyType[];
    statusFilter: CollisionStatus[];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    cameraAngle: CameraAngle;
  }) => void;
  resetFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  anomalyTypes: [],
  statusFilter: [],
  sortBy: 'detectedAt',
  sortOrder: 'desc',
  cameraAngle: 'iso',
  currentOperator: '方案经理-小赵',
  setAnomalyTypes: (v) => set({ anomalyTypes: v }),
  setStatusFilter: (v) => set({ statusFilter: v }),
  setSortBy: (v) => set({ sortBy: v }),
  setSortOrder: (v) => set({ sortOrder: v }),
  setCameraAngle: (v) => set({ cameraAngle: v }),
  applyView: (view) => set({
    anomalyTypes: view.anomalyTypes,
    statusFilter: view.statusFilter,
    sortBy: view.sortBy,
    sortOrder: view.sortOrder,
    cameraAngle: view.cameraAngle,
  }),
  resetFilters: () => set({
    anomalyTypes: [],
    statusFilter: [],
    sortBy: 'detectedAt',
    sortOrder: 'desc',
    cameraAngle: 'iso',
  }),
}));
