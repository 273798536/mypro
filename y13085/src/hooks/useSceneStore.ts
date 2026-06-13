import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FilterState, Viewpoint, PendingConfirm } from "../data/types";
import type { Material, TimelineEvent, Showcase, LightObject } from "../data/types";
import {
  lightObjects as initialLights,
  materials as initialMaterials,
  showcases as initialShowcases,
  timelineEvents as initialEvents,
  pendingConfirms as initialPending,
} from "../data/mockData";

interface SceneStore {
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  filterState: FilterState;
  setFilterState: (filter: FilterState) => void;
  currentTimeIndex: number;
  setCurrentTimeIndex: (index: number) => void;
  viewpoints: Viewpoint[];
  addViewpoint: (vp: Viewpoint) => void;
  removeViewpoint: (id: string) => void;
  pendingConfirms: PendingConfirm[];
  resolvePendingConfirm: (id: string) => void;
  showPendingModal: boolean;
  currentPendingId: string | null;
  setShowPendingModal: (show: boolean, id?: string | null) => void;
  lightObjects: LightObject[];
  materials: Material[];
  showcases: Showcase[];
  timelineEvents: TimelineEvent[];
  addMaterial: (material: Material) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  resetToInitial: () => void;
  initialized: boolean;
  setInitialized: (v: boolean) => void;
}

export const useSceneStore = create<SceneStore>()(
  persist(
    (set, get) => ({
      selectedObjectId: null,
      setSelectedObjectId: (id) => set({ selectedObjectId: id }),

      filterState: { objectType: null, zone: null, materialType: null },
      setFilterState: (filter) => set({ filterState: filter }),

      currentTimeIndex: 0,
      setCurrentTimeIndex: (index) => set({ currentTimeIndex: index }),

      viewpoints: [],
      addViewpoint: (vp) => set((s) => ({ viewpoints: [...s.viewpoints, vp] })),
      removeViewpoint: (id) =>
        set((s) => ({ viewpoints: s.viewpoints.filter((v) => v.id !== id) })),

      pendingConfirms: initialPending,
      resolvePendingConfirm: (id) =>
        set((s) => ({
          pendingConfirms: s.pendingConfirms.map((pc) =>
            pc.id === id ? { ...pc, resolved: true } : pc
          ),
        })),

      showPendingModal: false,
      currentPendingId: null,
      setShowPendingModal: (show, id) =>
        set({ showPendingModal: show, currentPendingId: id ?? null }),

      lightObjects: initialLights,
      materials: initialMaterials,
      showcases: initialShowcases,
      timelineEvents: initialEvents,

      addMaterial: (material) =>
        set((s) => ({ materials: [...s.materials, material] })),

      addTimelineEvent: (event) =>
        set((s) => ({ timelineEvents: [...s.timelineEvents, event] })),

      updateMaterial: (id, updates) =>
        set((s) => ({
          materials: s.materials.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      resetToInitial: () =>
        set({
          materials: initialMaterials,
          timelineEvents: initialEvents,
          pendingConfirms: initialPending,
          viewpoints: [],
          selectedObjectId: null,
        }),

      initialized: false,
      setInitialized: (v) => set({ initialized: v }),
    }),
    {
      name: "museum-review-store",
      partialize: (state) => ({
        viewpoints: state.viewpoints,
        pendingConfirms: state.pendingConfirms,
        materials: state.materials,
        timelineEvents: state.timelineEvents,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setInitialized(true);
        }
      },
    }
  )
);
