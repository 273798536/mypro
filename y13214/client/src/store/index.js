import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'chorus-royalty-ui-state';

export const useAppStore = create(
  persist(
    (set, get) => ({
      filters: {
        keyword: '',
        status: '',
        hideExpired: false,
        part: ''
      },
      manualNotes: {},
      screenshots: {},
      activeVersionId: null,
      operator: '运营-小孟',
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      resetFilters: () =>
        set({
          filters: { keyword: '', status: '', hideExpired: false, part: '' }
        }),
      setManualNote: (recordId, note) =>
        set({
          manualNotes: { ...get().manualNotes, [recordId]: note }
        }),
      setScreenshot: (recordId, url) =>
        set({
          screenshots: { ...get().screenshots, [recordId]: url }
        }),
      setActiveVersion: (id) => set({ activeVersionId: id }),
      setOperator: (name) => set({ operator: name })
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        filters: state.filters,
        manualNotes: state.manualNotes,
        screenshots: state.screenshots,
        activeVersionId: state.activeVersionId,
        operator: state.operator
      })
    }
  )
);
