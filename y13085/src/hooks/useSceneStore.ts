import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FilterState, Viewpoint, PendingConfirm } from "../data/types";
import { lightObjects, materials, showcases, timelineEvents, pendingConfirms as initialPending } from "../data/mockData";

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
  lightObjects: typeof lightObjects;
  materials: typeof materials;
  showcases: typeof showcases;
  timelineEvents: typeof timelineEvents;
  addMaterial: (material: typeof materials[0]) => void;
  addTimelineEvent: (event: typeof timelineEvents[0]) => void;
  updateMaterial: (id: string, updates: Partial<typeof materials[0]>) => void;
}

export const useSceneStore = create<SceneStore>()(
  persist(
    (set) => ({
      selectedObjectId: null,
      setSelectedObjectId: (id) => set({ selectedObjectId: id }),

      filterState: { objectType: null, zone: null, materialType: null },
      setFilterState: (filter) => set({ filterState: filter }),

      currentTimeIndex: 0,
      setCurrentTimeIndex: (index) => set({ currentTimeIndex: index }),

      viewpoints: [],
      addViewpoint: (vp) => set((s) => ({ viewpoints: [...s.viewpoints, vp] })),
      removeViewpoint: (id) => set((s) => ({ viewpoints: s.viewpoints.filter((v) => v.id !== id) })),

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

      lightObjects,
      materials,
      showcases,
      timelineEvents,

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
    }),
    {
      name: "museum-review-store",
      partialize: (state) => ({
        viewpoints: state.viewpoints,
        pendingConfirms: state.pendingConfirms,
      }),
    }
  )
);
