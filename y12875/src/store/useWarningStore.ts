import { create } from "zustand";
import {
  DEFAULT_THRESHOLDS,
} from "@/utils/formulaEngine";
import { MOCK_BUOY_RECORDS } from "@/data/mockData";

interface WarningState {
  selectedBuoyId: string;
  thresholds: typeof DEFAULT_THRESHOLDS;
  formulaExpanded: Record<string, boolean>;
}

interface WarningActions {
  setSelectedBuoyId: (id: string) => void;
  toggleFormula: (warningId: string) => void;
}

const latestApproved = MOCK_BUOY_RECORDS.filter(
  (r) => r.quality === "available" && r.reviewStatus === "approved"
).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

export const useWarningStore = create<WarningState & WarningActions>((set) => ({
  selectedBuoyId: latestApproved?.id || MOCK_BUOY_RECORDS[0].id,
  thresholds: DEFAULT_THRESHOLDS,
  formulaExpanded: {},

  setSelectedBuoyId: (id) => set({ selectedBuoyId: id }),

  toggleFormula: (warningId) => {
    set((state) => ({
      formulaExpanded: {
        ...state.formulaExpanded,
        [warningId]: !state.formulaExpanded[warningId],
      },
    }));
  },
}));
