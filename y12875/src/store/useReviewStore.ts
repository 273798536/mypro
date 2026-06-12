import { create } from "zustand";
import { CorrectionLog } from "@/types";
import { MOCK_CORRECTION_LOGS } from "@/data/mockData";

interface ReviewState {
  logs: CorrectionLog[];
  activeTab: "pending" | "approved";
  expandedLogId: string | null;
}

interface ReviewActions {
  addLog: (log: CorrectionLog) => void;
  setActiveTab: (tab: "pending" | "approved") => void;
  setExpandedLogId: (id: string | null) => void;
}

export const useReviewStore = create<ReviewState & ReviewActions>((set) => ({
  logs: MOCK_CORRECTION_LOGS,
  activeTab: "pending",
  expandedLogId: null,

  addLog: (log) => {
    set((state) => ({ logs: [log, ...state.logs] }));
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setExpandedLogId: (id) => set({ expandedLogId: id }),
}));
