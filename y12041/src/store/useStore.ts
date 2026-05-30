import { create } from "zustand";
import type { Level, LevelDetail, Judgment, ReportItem } from "../types";

interface LevelSlice {
  levels: Level[];
  currentLevel: LevelDetail | null;
  fetchLevels: () => Promise<void>;
  fetchLevelDetail: (id: string) => Promise<void>;
  importLevel: (data: Record<string, unknown>) => Promise<void>;
}

interface JudgmentSlice {
  judgments: Judgment[];
  fetchJudgments: (levelId: string) => Promise<void>;
  createJudgment: (data: Record<string, unknown>) => Promise<void>;
  patchJudgment: (id: string, emotionIds: string[]) => Promise<void>;
}

interface ReportSlice {
  reports: ReportItem[];
  fetchReports: (levelId: string) => Promise<void>;
  exportReport: (levelId: string) => Promise<void>;
}

interface UiSlice {
  currentReportIndex: number;
  setCurrentReportIndex: (n: number) => void;
}

export type StoreState = LevelSlice & JudgmentSlice & ReportSlice & UiSlice;

export const useStore = create<StoreState>((set) => ({
  levels: [],
  currentLevel: null,

  fetchLevels: async () => {
    try {
      const res = await fetch("/api/levels");
      const json = await res.json();
      set({ levels: json.data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchLevelDetail: async (id: string) => {
    try {
      const res = await fetch(`/api/levels/${id}`);
      const json = await res.json();
      set({ currentLevel: json.data });
    } catch (e) {
      console.error(e);
    }
  },

  importLevel: async (data: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/levels/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      set((state) => ({ levels: [json.data, ...state.levels] }));
    } catch (e) {
      console.error(e);
    }
  },

  judgments: [],

  fetchJudgments: async (levelId: string) => {
    try {
      const res = await fetch(`/api/judgments/${levelId}`);
      const json = await res.json();
      set({ judgments: json.data });
    } catch (e) {
      console.error(e);
    }
  },

  createJudgment: async (data: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/judgments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      set((state) => ({ judgments: [json.data, ...state.judgments] }));
    } catch (e) {
      console.error(e);
    }
  },

  patchJudgment: async (id: string, emotionIds: string[]) => {
    try {
      const res = await fetch(`/api/judgments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotionIds }),
      });
      const json = await res.json();
      set((state) => ({
        judgments: state.judgments.map((j) =>
          j.id === id ? json.data : j
        ),
      }));
    } catch (e) {
      console.error(e);
    }
  },

  reports: [],

  fetchReports: async (levelId: string) => {
    try {
      const res = await fetch(`/api/reports/${levelId}`);
      const json = await res.json();
      set({ reports: json.data });
    } catch (e) {
      console.error(e);
    }
  },

  exportReport: async (levelId: string) => {
    try {
      const res = await fetch(`/api/reports/${levelId}/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${levelId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  },

  currentReportIndex: 0,
  setCurrentReportIndex: (n: number) => set({ currentReportIndex: n }),
}));
