import { create } from "zustand";
import type { EventTypeKey } from "@/utils/constants";
import type { TimelineEvent } from "@/utils/types";
import { EVENTS } from "@/mock/events";

interface TimelineState {
  allEvents: TimelineEvent[];
  activeTypeFilters: EventTypeKey[];
  keyword: string;
  dateRange: [string, string] | null;
  getFilteredEvents: () => TimelineEvent[];
  toggleType: (t: EventTypeKey) => void;
  setTypes: (t: EventTypeKey[]) => void;
  setKeyword: (k: string) => void;
  setDateRange: (r: [string, string] | null) => void;
  resetFilters: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  allEvents: EVENTS,
  activeTypeFilters: [],
  keyword: "",
  dateRange: null,
  getFilteredEvents: () => {
    const { allEvents, activeTypeFilters, keyword, dateRange } = get();
    return allEvents
      .filter((e) => (activeTypeFilters.length ? activeTypeFilters.includes(e.type) : true))
      .filter((e) => {
        if (!dateRange) return true;
        const t = new Date(e.timestamp).getTime();
        return t >= new Date(dateRange[0]).getTime() && t <= new Date(dateRange[1]).getTime() + 86400000;
      })
      .filter((e) => {
        if (!keyword) return true;
        const kw = keyword.toLowerCase();
        return `${e.displayLabel} ${e.id} ${e.sampleId ?? ""} ${e.versionId ?? ""}`.toLowerCase().includes(kw);
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  toggleType: (t) =>
    set((s) => ({
      activeTypeFilters: s.activeTypeFilters.includes(t)
        ? s.activeTypeFilters.filter((x) => x !== t)
        : [...s.activeTypeFilters, t],
    })),
  setTypes: (t) => set({ activeTypeFilters: t }),
  setKeyword: (k) => set({ keyword: k }),
  setDateRange: (r) => set({ dateRange: r }),
  resetFilters: () => set({ activeTypeFilters: [], keyword: "", dateRange: null }),
}));
