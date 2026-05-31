import { create } from 'zustand';
import type { AppStore, ConflictType, ObjectType, TabType, Screenshot, TraceRecord } from '@/types';

export const useAppStore = create<AppStore>((set, get) => ({
  currentTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
  selectedObjectId: null,
  filters: {
    conflictTypes: ['cable_cross', 'equipment_block', 'route_conflict'],
    objectTypes: ['stage', 'musician', 'equipment', 'cable', 'route'],
    timeRange: [0, 60],
  },
  showDetailPanel: false,
  activeTab: 'conflicts',
  screenshots: [],
  showReportModal: false,
  totalDuration: 60,

  setCurrentTime: (time: number) => set({ currentTime: Math.max(0, Math.min(time, get().totalDuration)) }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),
  setSelectedObjectId: (id: string | null) => set({ selectedObjectId: id, showDetailPanel: id !== null }),
  setShowDetailPanel: (show: boolean) => set({ showDetailPanel: show }),
  setActiveTab: (tab: TabType) => set({ activeTab: tab }),

  toggleConflictFilter: (type: ConflictType) =>
    set((state) => {
      const exists = state.filters.conflictTypes.includes(type);
      return {
        filters: {
          ...state.filters,
          conflictTypes: exists
            ? state.filters.conflictTypes.filter((t) => t !== type)
            : [...state.filters.conflictTypes, type],
        },
      };
    }),

  toggleObjectTypeFilter: (type: ObjectType) =>
    set((state) => {
      const exists = state.filters.objectTypes.includes(type);
      return {
        filters: {
          ...state.filters,
          objectTypes: exists
            ? state.filters.objectTypes.filter((t) => t !== type)
            : [...state.filters.objectTypes, type],
        },
      };
    }),

  setTimeRange: (range: [number, number]) =>
    set((state) => ({
      filters: {
        ...state.filters,
        timeRange: range,
      },
    })),

  addScreenshot: (screenshot: Screenshot) =>
    set((state) => ({
      screenshots: [...state.screenshots, screenshot],
    })),

  removeScreenshot: (id: string) =>
    set((state) => ({
      screenshots: state.screenshots.filter((s) => s.id !== id),
    })),

  setShowReportModal: (show: boolean) => set({ showReportModal: show }),

  resolveConflict: (id: string) => {
    console.log('Conflict resolved:', id);
  },

  addTraceRecord: (conflictId: string, record: TraceRecord) => {
    console.log('Trace record added to conflict', conflictId, record);
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  reset: () => set({ currentTime: 0, isPlaying: false }),
}));
