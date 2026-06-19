import { create } from "zustand"
import type { AppState, EvaluationFilter } from "../types"

const defaultFilter: EvaluationFilter = {
  page: 1,
  pageSize: 20,
}

export const useStore = create<AppState>((set) => ({
  filter: { ...defaultFilter },
  setFilter: (partial) =>
    set((state) => ({
      filter: { ...state.filter, ...partial },
    })),
  resetFilter: () => set({ filter: { ...defaultFilter } }),
  selectedVersion: "",
  setSelectedVersion: (v) => set({ selectedVersion: v }),
  compareVersions: { previous: "", current: "" },
  setCompareVersions: (v) => set({ compareVersions: v }),
}))
