import { create } from "zustand";
import type {
  CommunityFeedback,
  ConsistencyReport,
  ItemStatus,
  Judgement,
  Location,
  Material,
  NoticeItem,
} from "@/shared/types";
import {
  consistencyCheck,
  consistencyFix,
  createFeedback,
  getFeedbacks,
  getItems,
  getJudgement,
  getLocations,
  getMaterials,
  getTimelineItems,
  uploadMaterial,
} from "@/lib/api";

interface Filters {
  status?: ItemStatus;
  keyword?: string;
  materialComplete?: "all" | "incomplete" | "complete";
}

interface StoreState {
  locations: Location[];
  materials: Material[];
  items: NoticeItem[];
  selectedItemId: string | null;
  selectedLocationId: string | null;
  hoveredLocationId: string | null;
  filters: Filters;
  timelineDate: string;
  judgements: Record<string, Judgement>;
  feedbacks: Record<string, CommunityFeedback[]>;
  consistencyReports: ConsistencyReport[];

  loadAll: () => Promise<void>;
  setSelectedItemId: (id: string | null) => void;
  setSelectedLocationId: (id: string | null) => void;
  setHoveredLocationId: (id: string | null) => void;
  setFilters: (patch: Partial<Filters>) => void;
  setTimelineDate: (date: string) => void;
  loadJudgement: (itemId: string) => Promise<void>;
  loadFeedbacks: (itemId: string) => Promise<void>;
  runConsistency: () => Promise<void>;
  fixConsistency: (report: ConsistencyReport) => Promise<void>;
  uploadMaterialAndRefresh: (formData: FormData) => Promise<void>;
}

function _computeFilteredItems(
  state: Pick<StoreState, "items" | "locations" | "filters">,
): NoticeItem[] {
  const { status, keyword, materialComplete } = state.filters;
  return state.items.filter((item) => {
    if (status && item.status !== status) return false;
    if (keyword) {
      const location = state.locations.find((l) => l.id === item.locationId);
      const kw = keyword.toLowerCase();
      const inCanonical = location?.canonicalName.toLowerCase().includes(kw);
      const inAliases = location?.aliases.some((a) =>
        a.toLowerCase().includes(kw),
      );
      if (!inCanonical && !inAliases) return false;
    }
    if (materialComplete && materialComplete !== "all") {
      const complete = item.materialIds.length >= 3;
      if (materialComplete === "complete" && !complete) return false;
      if (materialComplete === "incomplete" && complete) return false;
    }
    return true;
  });
}

export function selectFilteredItems(state: Pick<StoreState, "items"|"locations"|"filters">) {
  return _computeFilteredItems(state);
}
export function selectSelectedItem(state: Pick<StoreState, "items"|"selectedItemId">) {
  return state.items.find((i) => i.id === state.selectedItemId);
}
export function selectSelectedLocation(state: Pick<StoreState, "locations"|"selectedLocationId">) {
  return state.locations.find((l) => l.id === state.selectedLocationId);
}
export function selectTimelineItems(state: Pick<StoreState, "items">) {
  return state.items;
}

export const useStore = create<StoreState>((set, get) => ({
  locations: [],
  materials: [],
  items: [],
  selectedItemId: null,
  selectedLocationId: null,
  hoveredLocationId: null,
  filters: {},
  timelineDate: new Date().toISOString().slice(0, 10),
  judgements: {},
  feedbacks: {},
  consistencyReports: [],

  loadAll: async () => {
    const [locations, materials, items] = await Promise.all([
      getLocations(),
      getMaterials(),
      getItems(),
    ]);
    set({ locations, materials, items });
  },

  setSelectedItemId: (id) => set({ selectedItemId: id }),

  setSelectedLocationId: (id) => {
    const state = get();
    const item = state.items.find((i) => i.locationId === id);
    set({
      selectedLocationId: id,
      selectedItemId: item ? item.id : state.selectedItemId,
    });
  },

  setHoveredLocationId: (id) => set({ hoveredLocationId: id }),

  setFilters: (patch) =>
    set((state) => ({ filters: { ...state.filters, ...patch } })),

  setTimelineDate: (date) => set({ timelineDate: date }),

  loadJudgement: async (itemId) => {
    const judgement = await getJudgement(itemId);
    set((state) => ({
      judgements: { ...state.judgements, [itemId]: judgement },
    }));
  },

  loadFeedbacks: async (itemId) => {
    const feedbacks = await getFeedbacks(itemId);
    set((state) => ({
      feedbacks: { ...state.feedbacks, [itemId]: feedbacks },
    }));
    void createFeedback;
  },

  runConsistency: async () => {
    const reports = await consistencyCheck();
    set({ consistencyReports: reports });
  },

  fixConsistency: async (report) => {
    await consistencyFix(report);
    await get().runConsistency();
  },

  uploadMaterialAndRefresh: async (formData) => {
    await uploadMaterial(formData);
    const materials = await getMaterials();
    set({ materials });
  },
}));
