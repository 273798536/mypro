import { create } from "zustand";
import type {
  FlightRoute,
  RiskLevel,
  AnomalyType,
  ConfirmationStatus,
  ViewSnapshot,
  RiskNoteVersion,
  HandlingOpinion,
} from "@/types";
import { mockRoutes } from "@/data/mockRoutes";

interface FilterState {
  riskLevels: RiskLevel[];
  anomalyTypes: AnomalyType[];
  statuses: ConfirmationStatus[];
  searchQuery: string;
  onlyAnomalies: boolean;
}

interface RouteStore {
  routes: FlightRoute[];
  filters: FilterState;
  selectedRouteId: string | null;

  setSelectedRoute: (id: string | null) => void;
  getFilteredRoutes: () => FlightRoute[];
  getRouteById: (id: string) => FlightRoute | undefined;

  toggleRiskFilter: (level: RiskLevel) => void;
  toggleAnomalyFilter: (type: AnomalyType) => void;
  toggleStatusFilter: (status: ConfirmationStatus) => void;
  setSearchQuery: (q: string) => void;
  setOnlyAnomalies: (v: boolean) => void;
  clearFilters: () => void;

  addViewSnapshot: (routeId: string, snapshot: ViewSnapshot) => void;
  setCurrentView: (routeId: string, snapshotId: string) => void;

  addRiskNote: (routeId: string, note: Omit<RiskNoteVersion, "id" | "version" | "createdAt">) => void;

  addHandlingOpinion: (routeId: string, opinion: Omit<HandlingOpinion, "id" | "createdAt">) => void;
  updateOpinionStatus: (routeId: string, opinionId: string, status: HandlingOpinion["status"]) => void;

  setRerunStatus: (
    routeId: string,
    status: FlightRoute["threeStepReview"]["rerun"]["status"],
    extra?: Partial<FlightRoute["threeStepReview"]["rerun"]>
  ) => void;
  setSupplementStatus: (
    routeId: string,
    status: FlightRoute["threeStepReview"]["supplement"]["status"],
    extra?: Partial<FlightRoute["threeStepReview"]["supplement"]>
  ) => void;
  setManualConfirmStatus: (
    routeId: string,
    status: FlightRoute["threeStepReview"]["manualConfirm"]["status"],
    extra?: Partial<FlightRoute["threeStepReview"]["manualConfirm"]>
  ) => void;

  attemptCameraRepair: (routeId: string, method: string, by: string) => void;

  importRoutes: (routes: FlightRoute[]) => void;
  runAnomalyDetection: () => Record<AnomalyType, number>;
}

const initialFilters: FilterState = {
  riskLevels: [],
  anomalyTypes: [],
  statuses: [],
  searchQuery: "",
  onlyAnomalies: false,
};

export const useRouteStore = create<RouteStore>((set, get) => ({
  routes: mockRoutes,
  filters: initialFilters,
  selectedRouteId: null,

  setSelectedRoute: (id) => set({ selectedRouteId: id }),

  getFilteredRoutes: () => {
    const { routes, filters } = get();
    return routes.filter((r) => {
      if (filters.onlyAnomalies && r.anomalyTypes.length === 0) return false;
      if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(r.riskLevel)) return false;
      if (
        filters.anomalyTypes.length > 0 &&
        !filters.anomalyTypes.some((t) => r.anomalyTypes.includes(t))
      )
        return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(r.status)) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (
          !r.routeCode.toLowerCase().includes(q) &&
          !r.missionName.toLowerCase().includes(q) &&
          !r.dataSource.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  },

  getRouteById: (id) => get().routes.find((r) => r.id === id),

  toggleRiskFilter: (level) =>
    set((state) => ({
      filters: {
        ...state.filters,
        riskLevels: state.filters.riskLevels.includes(level)
          ? state.filters.riskLevels.filter((l) => l !== level)
          : [...state.filters.riskLevels, level],
      },
    })),

  toggleAnomalyFilter: (type) =>
    set((state) => ({
      filters: {
        ...state.filters,
        anomalyTypes: state.filters.anomalyTypes.includes(type)
          ? state.filters.anomalyTypes.filter((t) => t !== type)
          : [...state.filters.anomalyTypes, type],
      },
    })),

  toggleStatusFilter: (status) =>
    set((state) => ({
      filters: {
        ...state.filters,
        statuses: state.filters.statuses.includes(status)
          ? state.filters.statuses.filter((s) => s !== status)
          : [...state.filters.statuses, status],
      },
    })),

  setSearchQuery: (q) => set((state) => ({ filters: { ...state.filters, searchQuery: q } })),

  setOnlyAnomalies: (v) => set((state) => ({ filters: { ...state.filters, onlyAnomalies: v } })),

  clearFilters: () => set({ filters: initialFilters }),

  addViewSnapshot: (routeId, snapshot) =>
    set((state) => ({
      routes: state.routes.map((r) =>
        r.id === routeId ? { ...r, viewSnapshots: [...r.viewSnapshots, snapshot] } : r
      ),
    })),

  setCurrentView: (routeId, snapshotId) =>
    set((state) => ({
      routes: state.routes.map((r) => (r.id === routeId ? { ...r, currentViewId: snapshotId } : r)),
    })),

  addRiskNote: (routeId, note) =>
    set((state) => ({
      routes: state.routes.map((r) => {
        if (r.id !== routeId) return r;
        const nextVersion = r.riskNoteHistory.length + 1;
        const newNote: RiskNoteVersion = {
          ...note,
          id: `rn-${routeId}-v${nextVersion}`,
          version: nextVersion,
          createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        };
        return {
          ...r,
          riskNoteHistory: [...r.riskNoteHistory, newNote],
          currentNoteId: newNote.id,
        };
      }),
    })),

  addHandlingOpinion: (routeId, opinion) =>
    set((state) => ({
      routes: state.routes.map((r) => {
        if (r.id !== routeId) return r;
        const newOp: HandlingOpinion = {
          ...opinion,
          id: `op-${Date.now()}`,
          createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        };
        return { ...r, handlingOpinions: [...r.handlingOpinions, newOp] };
      }),
    })),

  updateOpinionStatus: (routeId, opinionId, status) =>
    set((state) => ({
      routes: state.routes.map((r) =>
        r.id === routeId
          ? {
              ...r,
              handlingOpinions: r.handlingOpinions.map((o) =>
                o.id === opinionId ? { ...o, status } : o
              ),
            }
          : r
      ),
    })),

  setRerunStatus: (routeId, status, extra) =>
    set((state) => ({
      routes: state.routes.map((r) =>
        r.id === routeId
          ? {
              ...r,
              threeStepReview: { ...r.threeStepReview, rerun: { ...r.threeStepReview.rerun, status, ...extra } },
              status: status === "passed" ? "rerun_done" : r.status,
            }
          : r
      ),
    })),

  setSupplementStatus: (routeId, status, extra) =>
    set((state) => ({
      routes: state.routes.map((r) =>
        r.id === routeId
          ? {
              ...r,
              threeStepReview: {
                ...r.threeStepReview,
                supplement: { ...r.threeStepReview.supplement, status, ...extra },
              },
              status: status === "completed" ? "supplemented" : r.status,
            }
          : r
      ),
    })),

  setManualConfirmStatus: (routeId, status, extra) =>
    set((state) => ({
      routes: state.routes.map((r) => {
        if (r.id !== routeId) return r;
        const newReview = {
          ...r.threeStepReview,
          manualConfirm: { ...r.threeStepReview.manualConfirm, status, ...extra },
        };
        const allDone =
          newReview.rerun.status !== "not_started" &&
          (newReview.supplement.status === "completed" || newReview.supplement.status === "not_needed") &&
          newReview.manualConfirm.status === "confirmed";
        return {
          ...r,
          threeStepReview: newReview,
          status: allDone ? "all_completed" : status === "confirmed" ? "manually_confirmed" : r.status,
        };
      }),
    })),

  attemptCameraRepair: (routeId, method, by) =>
    set((state) => ({
      routes: state.routes.map((r) => {
        if (r.id !== routeId || !r.cameraViewIssue) return r;
        const success = Math.random() > 0.4;
        const attempt = {
          attemptedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
          attemptedBy: by,
          result: success ? ("success" as const) : ("failed" as const),
          method,
        };
        return {
          ...r,
          cameraViewIssue: {
            ...r.cameraViewIssue,
            repairAttempts: r.cameraViewIssue.repairAttempts + 1,
            lastRepairAt: attempt.attemptedAt,
            repairHistory: [...r.cameraViewIssue.repairHistory, attempt],
            isReported: !success,
            lostParams: success ? undefined : r.cameraViewIssue.lostParams,
          },
          anomalyTypes: success
            ? r.anomalyTypes.filter((t) => t !== "camera_view_lost")
            : r.anomalyTypes,
        };
      }),
    })),

  importRoutes: (newRoutes) =>
    set((state) => ({ routes: [...state.routes, ...newRoutes] })),

  runAnomalyDetection: () => {
    const { routes } = get();
    const counts: Record<AnomalyType, number> = {
      camera_view_lost: 0,
      height_deviation: 0,
      coordinate_missing: 0,
      risk_note_conflict: 0,
      profile_incomplete: 0,
    };
    routes.forEach((r) => {
      r.anomalyTypes.forEach((t) => {
        counts[t]++;
      });
    });
    return counts;
  },
}));
