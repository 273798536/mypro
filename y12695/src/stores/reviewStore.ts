import { create } from "zustand";
import type {
  Judgment,
  JudgmentType,
  CutAxis,
  ScreenshotExport,
  CollisionResult,
} from "@/types";

interface ReviewState {
  judgments: Record<string, Judgment[]>;
  screenshots: Record<string, ScreenshotExport[]>;
  lastCollision: CollisionResult | null;
  highlightedRecordId: string | null;
  selectedOutlierId: string | null;

  addJudgment: (
    sessionId: string,
    data: Omit<Judgment, "id" | "sessionId" | "timestamp">,
  ) => Judgment;
  updateJudgmentComment: (
    sessionId: string,
    judgmentId: string,
    comment: string,
  ) => void;
  setLastCollision: (result: CollisionResult | null) => void;
  setHighlightedRecordId: (id: string | null) => void;
  setSelectedOutlierId: (id: string | null) => void;
  addScreenshot: (sessionId: string, screenshot: ScreenshotExport) => void;
  clearSession: (sessionId: string) => void;
  getSessionJudgments: (sessionId: string) => Judgment[];
  getSessionScreenshots: (sessionId: string) => ScreenshotExport[];
  calculateScore: (sessionId: string, targetJudgments: number) => {
    score: number;
    accuracy: number;
    safe: number;
    review: number;
    error: number;
  };
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadJudgments(): Record<string, Judgment[]> {
  try {
    const raw = localStorage.getItem("pore-judgments");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveJudgments(all: Record<string, Judgment[]>) {
  localStorage.setItem("pore-judgments", JSON.stringify(all));
}

function loadScreenshots(): Record<string, ScreenshotExport[]> {
  try {
    const raw = localStorage.getItem("pore-screenshots");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveScreenshots(all: Record<string, ScreenshotExport[]>) {
  localStorage.setItem("pore-screenshots", JSON.stringify(all));
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  judgments: loadJudgments(),
  screenshots: loadScreenshots(),
  lastCollision: null,
  highlightedRecordId: null,
  selectedOutlierId: null,

  addJudgment: (sessionId, data) => {
    const judgment: Judgment = {
      id: makeId("jud"),
      sessionId,
      timestamp: Date.now(),
      ...data,
    };
    const all = { ...get().judgments };
    all[sessionId] = [...(all[sessionId] || []), judgment];
    saveJudgments(all);
    set({ judgments: all });
    return judgment;
  },

  updateJudgmentComment: (sessionId, judgmentId, comment) => {
    const all = { ...get().judgments };
    if (all[sessionId]) {
      all[sessionId] = all[sessionId].map((j) =>
        j.id === judgmentId ? { ...j, comment } : j,
      );
      saveJudgments(all);
      set({ judgments: all });
    }
  },

  setLastCollision: (result) => set({ lastCollision: result }),
  setHighlightedRecordId: (id) => set({ highlightedRecordId: id }),
  setSelectedOutlierId: (id) => set({ selectedOutlierId: id }),

  addScreenshot: (sessionId, screenshot) => {
    const all = { ...get().screenshots };
    all[sessionId] = [...(all[sessionId] || []), screenshot];
    saveScreenshots(all);
    set({ screenshots: all });
  },

  clearSession: (sessionId) => {
    const j = { ...get().judgments };
    delete j[sessionId];
    saveJudgments(j);
    const s = { ...get().screenshots };
    delete s[sessionId];
    saveScreenshots(s);
    set({ judgments: j, screenshots: s });
  },

  getSessionJudgments: (sessionId) => {
    return get().judgments[sessionId] || [];
  },

  getSessionScreenshots: (sessionId) => {
    return get().screenshots[sessionId] || [];
  },

  calculateScore: (sessionId, targetJudgments) => {
    const list = get().judgments[sessionId] || [];
    let safe = 0;
    let review = 0;
    let error = 0;
    let score = 0;
    list.forEach((j) => {
      if (j.type === "safe") {
        safe++;
        score += j.isBoundaryCrossed ? 0 : 20;
      } else if (j.type === "review") {
        review++;
        score += 10;
      } else {
        error++;
        score += j.isBoundaryCrossed ? 15 : -5;
      }
    });
    const total = Math.max(list.length, targetJudgments);
    const accuracy = total > 0 ? Math.round(((safe + (j_isCorrectReview(list))) / total) * 100) : 0;
    return { score: Math.max(0, score), accuracy: Math.min(100, accuracy), safe, review, error };
  },
}));

function j_isCorrectReview(list: Judgment[]): number {
  return list.filter((j) => j.type === "review" && j.isBoundaryCrossed).length;
}

export type { JudgmentType, CutAxis };
