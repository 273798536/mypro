import { create } from "zustand";
import type { ReviewPoint, FilterState, PointStatus } from "@/types";
import { mockPoints } from "@/data/mockData";

const STORAGE_KEY = "market_review_points_v1";

interface ReviewStore extends FilterState {
  points: ReviewPoint[];
  setActiveStatus: (s: PointStatus | "all") => void;
  setSearchKeyword: (kw: string) => void;
  updatePointStatus: (id: string, status: PointStatus) => void;
  getFilteredPoints: () => ReviewPoint[];
  getPointById: (id: string) => ReviewPoint | undefined;
  getStatusCounts: () => { all: number; processed: number; pending_site: number; conflict: number };
}

function loadPoints(): ReviewPoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {
    /* ignore */
  }
  return mockPoints;
}

function persist(points: ReviewPoint[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
  } catch (_) {
    /* ignore */
  }
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  points: loadPoints(),
  activeStatus: "all",
  searchKeyword: "",

  setActiveStatus: (s) => set({ activeStatus: s }),
  setSearchKeyword: (kw) => set({ searchKeyword: kw }),

  updatePointStatus: (id, status) => {
    const updated = get().points.map((p) =>
      p.id === id
        ? { ...p, status, lastUpdatedAt: new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-"), lastUpdatedBy: "周姐" }
        : p,
    );
    persist(updated);
    set({ points: updated });
  },

  getFilteredPoints: () => {
    const { points, activeStatus, searchKeyword } = get();
    return points.filter((p) => {
      const matchStatus = activeStatus === "all" ? true : p.status === activeStatus;
      const matchKw = searchKeyword.trim()
        ? p.name.includes(searchKeyword) || p.address.includes(searchKeyword)
        : true;
      return matchStatus && matchKw;
    });
  },

  getPointById: (id) => get().points.find((p) => p.id === id),

  getStatusCounts: () => {
    const { points } = get();
    return points.reduce(
      (acc, p) => {
        acc.all += 1;
        if (p.status === "processed") acc.processed += 1;
        else if (p.status === "pending_site") acc.pending_site += 1;
        else if (p.status === "conflict") acc.conflict += 1;
        return acc;
      },
      { all: 0, processed: 0, pending_site: 0, conflict: 0 },
    );
  },
}));
