import { create } from "zustand";
import type { TimelineEntry, OperationType } from "@/types";
import { mockTimeline } from "@/utils/mockData";

interface TimelineState {
  entries: TimelineEntry[];
  filterOperation: OperationType | "all";
  searchQuery: string;
  setFilterOperation: (op: OperationType | "all") => void;
  setSearchQuery: (query: string) => void;
  addEntry: (entry: TimelineEntry) => void;
  getEntriesByParameterId: (parameterId: string) => TimelineEntry[];
  getFilteredEntries: () => TimelineEntry[];
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  entries: mockTimeline,
  filterOperation: "all",
  searchQuery: "",

  setFilterOperation: (op) => set({ filterOperation: op }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  addEntry: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries],
    })),

  getEntriesByParameterId: (parameterId) =>
    get()
      .entries.filter((e) => e.parameterId === parameterId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),

  getFilteredEntries: () => {
    const { entries, filterOperation, searchQuery } = get();
    return entries
      .filter((e) => {
        if (filterOperation !== "all" && e.operationType !== filterOperation) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (
            !e.parameterName.toLowerCase().includes(q) &&
            !e.reason.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
}));
