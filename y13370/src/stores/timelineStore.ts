import { create } from 'zustand';
import type { TimelineEvent, EventType, ConsistencyReport } from '@/types';
import { mockTimeline } from '@/data/sampleData';
import { runFullConsistencyCheck } from '@/utils/consistencyChecker';

interface TimelineState {
  events: TimelineEvent[];
  filteredEvents: TimelineEvent[];
  typeFilter: EventType[];
  versionFilter: string | null;
  consistencyReport: ConsistencyReport | null;
  isChecking: boolean;
  init: () => void;
  setTypeFilter: (types: EventType[]) => void;
  setVersionFilter: (v: string | null) => void;
  applyFilters: () => void;
  runCheck: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  events: [],
  filteredEvents: [],
  typeFilter: [],
  versionFilter: null,
  consistencyReport: null,
  isChecking: false,
  init: () => {
    if (get().events.length > 0) return;
    set({ events: [...mockTimeline] });
    get().applyFilters();
  },
  setTypeFilter: (types) => {
    set({ typeFilter: types });
    get().applyFilters();
  },
  setVersionFilter: (v) => {
    set({ versionFilter: v });
    get().applyFilters();
  },
  applyFilters: () => {
    const { events, typeFilter, versionFilter } = get();
    let filtered = [...events];
    if (typeFilter.length > 0) {
      filtered = filtered.filter(e => typeFilter.includes(e.eventType));
    }
    if (versionFilter) {
      filtered = filtered.filter(e => e.refId.includes(versionFilter));
    }
    filtered.sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
    set({ filteredEvents: filtered });
  },
  runCheck: () => {
    set({ isChecking: true });
    setTimeout(() => {
      const { events } = get();
      const result = runFullConsistencyCheck(events);
      set({
        events: result.events,
        consistencyReport: result.report,
        isChecking: false
      });
      get().applyFilters();
    }, 800);
  }
}));
