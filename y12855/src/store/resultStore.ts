import { create } from "zustand";
import type { ViewRole, Availability } from "@/types";
import type { Inspection } from "@/types";
import { MOCK_INSPECTIONS } from "@/data/mockData";

interface ResultState {
  viewRole: ViewRole;
  availabilityFilter: Availability | "ALL";
  dateRange: { start: string; end: string };
  ranchFilter: string | "ALL";
  setViewRole: (r: ViewRole) => void;
  setAvailabilityFilter: (a: Availability | "ALL") => void;
  setDateRange: (start: string, end: string) => void;
  setRanchFilter: (r: string) => void;
  getMaritimeGroups: () => {
    directUse: Inspection[];
    needReview: Inspection[];
  };
  countByAvailability: () => Record<Availability, number>;
}

const today = new Date();
const start = new Date(today);
start.setDate(today.getDate() - 5);
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export const useResultStore = create<ResultState>((set, get) => ({
  viewRole: "DISPATCHER",
  availabilityFilter: "ALL",
  dateRange: { start: fmt(start), end: fmt(today) },
  ranchFilter: "ALL",

  setViewRole: (r) => set({ viewRole: r }),
  setAvailabilityFilter: (a) => set({ availabilityFilter: a }),
  setDateRange: (startDate, endDate) =>
    set({ dateRange: { start: startDate, end: endDate } }),
  setRanchFilter: (r) => set({ ranchFilter: r }),

  getMaritimeGroups: () => {
    const s = get();
    const list = MOCK_INSPECTIONS.filter((i) => {
      if (s.ranchFilter !== "ALL" && i.ranchName !== s.ranchFilter) return false;
      return true;
    });
    const directUse = list.filter((i) => i.availability === "AVAILABLE");
    const needReview = list.filter(
      (i) => i.availability === "PENDING" || i.availability === "RECOLLECT",
    );
    return { directUse, needReview };
  },

  countByAvailability: () => {
    const list = MOCK_INSPECTIONS;
    return {
      AVAILABLE: list.filter((i) => i.availability === "AVAILABLE").length,
      PENDING: list.filter((i) => i.availability === "PENDING").length,
      RECOLLECT: list.filter((i) => i.availability === "RECOLLECT").length,
    };
  },
}));
