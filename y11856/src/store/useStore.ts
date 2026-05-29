import { create } from 'zustand';
import type {
  Sample,
  ProjectionPoint,
  DimensionReductionConfig,
  Viewpoint,
  OverlapRegion,
  OutlierInfo,
  MergeDiff,
} from '@/types';

interface StoreState {
  samples: Sample[];
  projections: ProjectionPoint[];
  instabilityTrails: ProjectionPoint[][];
  config: DimensionReductionConfig;
  selectedCategories: Set<string>;
  viewpoints: Viewpoint[];
  overlapRegions: OverlapRegion[];
  outliers: OutlierInfo[];
  showOutliers: boolean;
  showInstability: boolean;
  hoveredSampleId: string | null;
  selectedSampleId: string | null;
  mergeDiffs: MergeDiff[];
  pendingCameraMove: { position: [number, number, number]; target: [number, number, number] } | null;
  onCameraCapture: (() => { position: [number, number, number]; target: [number, number, number] }) | null;
}

interface StoreActions {
  setSamples: (samples: Sample[]) => void;
  setProjections: (points: ProjectionPoint[]) => void;
  setInstabilityTrails: (trails: ProjectionPoint[][]) => void;
  setConfig: (config: DimensionReductionConfig) => void;
  toggleCategory: (cat: string) => void;
  addViewpoint: (vp: Viewpoint) => void;
  removeViewpoint: (id: string) => void;
  setOverlapRegions: (regions: OverlapRegion[]) => void;
  setOutliers: (outliers: OutlierInfo[]) => void;
  setShowOutliers: (show: boolean) => void;
  setShowInstability: (show: boolean) => void;
  setHoveredSampleId: (id: string | null) => void;
  setSelectedSampleId: (id: string | null) => void;
  setMergeDiffs: (diffs: MergeDiff[]) => void;
  resolveMergeDiff: (
    sampleId: string,
    field: string,
    resolution: 'source' | 'target',
  ) => void;
  setPendingCameraMove: (move: { position: [number, number, number]; target: [number, number, number] } | null) => void;
  setOnCameraCapture: (fn: (() => { position: [number, number, number]; target: [number, number, number] }) | null) => void;
  clearPendingCameraMove: () => void;
}

export type Store = StoreState & StoreActions;

export const useStore = create<Store>((set) => ({
  samples: [],
  projections: [],
  instabilityTrails: [],
  config: { method: 'pca', params: {} },
  selectedCategories: new Set(['A', 'B', 'C']),
  viewpoints: [],
  overlapRegions: [],
  outliers: [],
  showOutliers: false,
  showInstability: false,
  hoveredSampleId: null,
  selectedSampleId: null,
  mergeDiffs: [],
  pendingCameraMove: null,
  onCameraCapture: null,

  setSamples: (samples) => set({ samples }),
  setProjections: (points) => set({ projections: points }),
  setInstabilityTrails: (trails) => set({ instabilityTrails: trails }),
  setConfig: (config) => set({ config }),
  toggleCategory: (cat) =>
    set((state) => {
      const next = new Set(state.selectedCategories);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return { selectedCategories: next };
    }),
  addViewpoint: (vp) =>
    set((state) => ({ viewpoints: [...state.viewpoints, vp] })),
  removeViewpoint: (id) =>
    set((state) => ({
      viewpoints: state.viewpoints.filter((v) => v.id !== id),
    })),
  setOverlapRegions: (regions) => set({ overlapRegions: regions }),
  setOutliers: (outliers) => set({ outliers }),
  setShowOutliers: (show) => set({ showOutliers: show }),
  setShowInstability: (show) => set({ showInstability: show }),
  setHoveredSampleId: (id) => set({ hoveredSampleId: id }),
  setSelectedSampleId: (id) => set({ selectedSampleId: id }),
  setMergeDiffs: (diffs) => set({ mergeDiffs: diffs }),
  resolveMergeDiff: (sampleId, field, resolution) =>
    set((state) => ({
      mergeDiffs: state.mergeDiffs.map((d) =>
        d.sampleId === sampleId && d.field === field
          ? { ...d, resolution }
          : d,
      ),
    })),
  setPendingCameraMove: (move) => set({ pendingCameraMove: move }),
  setOnCameraCapture: (fn) => set({ onCameraCapture: fn }),
  clearPendingCameraMove: () => set({ pendingCameraMove: null }),
}));
