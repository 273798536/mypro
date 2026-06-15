import { create } from "zustand";
import { ComplaintPoint, ComplaintStatus, ComplaintSource, TimelinePhase, JudgmentHistory, PhotoAttachment } from "@/types";
import { generateMockPoints, generateTimelinePhases } from "@/services/mockData";

interface FilterState {
  sources: ComplaintSource[];
  statuses: ComplaintStatus[];
  showConflictOnly: boolean;
  searchQuery: string;
}

interface AppState {
  points: ComplaintPoint[];
  filteredPoints: ComplaintPoint[];
  selectedPointId: string | null;
  hoveredPointId: string | null;
  timelinePhases: TimelinePhase[];
  currentPhaseIndex: number;
  isPlaying: boolean;
  filters: FilterState;
  isFilterPanelOpen: boolean;
  isHistoryDrawerOpen: boolean;
  isGuideVisible: boolean;
  focusPosition: [number, number, number] | null;

  setPoints: (points: ComplaintPoint[]) => void;
  selectPoint: (id: string | null) => void;
  hoverPoint: (id: string | null) => void;
  setPhaseIndex: (index: number) => void;
  togglePlaying: () => void;
  setPlaying: (val: boolean) => void;
  updateFilters: (filters: Partial<FilterState>) => void;
  applyFilters: () => void;
  toggleFilterPanel: () => void;
  toggleHistoryDrawer: () => void;
  setGuideVisible: (val: boolean) => void;
  setFocusPosition: (pos: [number, number, number] | null) => void;
  addJudgment: (pointId: string, judgment: string, reason: string) => void;
  addPhoto: (pointId: string, photo: PhotoAttachment) => void;
  getSelectedPoint: () => ComplaintPoint | undefined;
}

const initialPoints = generateMockPoints();
const initialPhases = generateTimelinePhases();

const applyFilterLogic = (points: ComplaintPoint[], filters: FilterState): ComplaintPoint[] => {
  return points.filter((p) => {
    if (filters.sources.length > 0 && !filters.sources.includes(p.source)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;
    if (filters.showConflictOnly && !p.isConflict) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const inAddr = p.address.toLowerCase().includes(q);
      const inId = p.id.toLowerCase().includes(q);
      const inContent = p.records.some((r) => r.complaintContent.toLowerCase().includes(q));
      if (!inAddr && !inId && !inContent) return false;
    }
    return true;
  });
};

export const useAppStore = create<AppState>((set, get) => ({
  points: initialPoints,
  filteredPoints: applyFilterLogic(initialPoints, {
    sources: [],
    statuses: [],
    showConflictOnly: false,
    searchQuery: "",
  }),
  selectedPointId: null,
  hoveredPointId: null,
  timelinePhases: initialPhases,
  currentPhaseIndex: 0,
  isPlaying: false,
  filters: {
    sources: [],
    statuses: [],
    showConflictOnly: false,
    searchQuery: "",
  },
  isFilterPanelOpen: true,
  isHistoryDrawerOpen: false,
  isGuideVisible: !localStorage.getItem("guide_dismissed"),
  focusPosition: null,

  setPoints: (points) => set({ points }),

  selectPoint: (id) =>
    set({
      selectedPointId: id,
      isHistoryDrawerOpen: id !== null ? true : false,
    }),

  hoverPoint: (id) => set({ hoveredPointId: id }),

  setPhaseIndex: (index) => set({ currentPhaseIndex: index }),

  togglePlaying: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (val) => set({ isPlaying: val }),

  updateFilters: (partial) =>
    set((s) => ({ filters: { ...s.filters, ...partial } })),

  applyFilters: () =>
    set((s) => ({
      filteredPoints: applyFilterLogic(s.points, s.filters),
    })),

  toggleFilterPanel: () =>
    set((s) => ({ isFilterPanelOpen: !s.isFilterPanelOpen })),

  toggleHistoryDrawer: () =>
    set((s) => ({ isHistoryDrawerOpen: !s.isHistoryDrawerOpen })),

  setGuideVisible: (val) => {
    if (!val) localStorage.setItem("guide_dismissed", "1");
    set({ isGuideVisible: val });
  },

  setFocusPosition: (pos) => set({ focusPosition: pos }),

  addJudgment: (pointId, judgment, reason) =>
    set((s) => {
      const points = s.points.map((p) => {
        if (p.id !== pointId) return p;
        const newHistory: JudgmentHistory = {
          id: `${pointId}-hist-${p.history.length}`,
          pointId,
          judgmentBefore: p.currentJudgment,
          judgmentAfter: judgment,
          operator: "规划师小赵",
          modifiedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
          changeReason: reason,
        };
        return {
          ...p,
          currentJudgment: judgment,
          history: [...p.history, newHistory],
        };
      });
      return {
        points,
        filteredPoints: applyFilterLogic(points, s.filters),
      };
    }),

  addPhoto: (pointId, photo) =>
    set((s) => {
      const points = s.points.map((p) => {
        if (p.id !== pointId) return p;
        return { ...p, photos: [...p.photos, photo] };
      });
      return {
        points,
        filteredPoints: applyFilterLogic(points, s.filters),
      };
    }),

  getSelectedPoint: () => {
    const s = get();
    return s.points.find((p) => p.id === s.selectedPointId);
  },
}));
