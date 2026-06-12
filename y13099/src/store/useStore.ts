import { create } from "zustand";
import type {
  Plan,
  PlanDetail,
  PlanStatus,
  TimelineNode,
  SensorRecord,
  ListPlansResponse,
  ListExceptionsResponse,
} from "@shared/types";

interface AppState {
  plans: Plan[];
  plansTotal: number;
  planDetail: PlanDetail | null;
  exceptions: Plan[];
  filterSnapshot: Record<string, string>;
  currentTimelineNode: TimelineNode | null;
  loading: Record<string, boolean>;
  sensorDetail: SensorRecord | null;
  showSensorModal: boolean;
  showRejudgeModal: boolean;
  rejudgePlanId: string | null;

  fetchPlans: (filters?: {
    status?: string;
    corridorCode?: string;
    from?: string;
    to?: string;
  }) => Promise<void>;
  fetchPlanDetail: (id: string) => Promise<void>;
  fetchExceptions: (filters?: {
    status?: string;
    corridorCode?: string;
  }) => Promise<void>;
  fetchSensorDetail: (id: string) => Promise<void>;
  setCurrentTimelineNode: (node: TimelineNode | null) => void;
  setShowSensorModal: (show: boolean) => void;
  setShowRejudgeModal: (show: boolean, planId?: string) => void;
  rejudgePlan: (
    planId: string,
    data: { reason: string; supplementedMaterials: string[]; newStatus: PlanStatus }
  ) => Promise<void>;
  exportExceptions: (filters?: {
    format?: string;
    status?: string;
    corridorCode?: string;
  }) => Promise<string>;
  clearPlanDetail: () => void;
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const useStore = create<AppState>((set, get) => ({
  plans: [],
  plansTotal: 0,
  planDetail: null,
  exceptions: [],
  filterSnapshot: {},
  currentTimelineNode: null,
  loading: {},
  sensorDetail: null,
  showSensorModal: false,
  showRejudgeModal: false,
  rejudgePlanId: null,

  fetchPlans: async (filters) => {
    set({ loading: { ...get().loading, plans: true } });
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.corridorCode) params.set("corridorCode", filters.corridorCode);
      if (filters?.from) params.set("from", filters.from);
      if (filters?.to) params.set("to", filters.to);
      const url = `/api/plans${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await apiGet<ListPlansResponse>(url);
      set({
        plans: data.plans,
        plansTotal: data.total,
        filterSnapshot: data.filterSnapshot,
        loading: { ...get().loading, plans: false },
      });
    } catch (e) {
      console.error(e);
      set({ loading: { ...get().loading, plans: false } });
    }
  },

  fetchPlanDetail: async (id) => {
    set({ loading: { ...get().loading, planDetail: true } });
    try {
      const data = await apiGet<{ plan: PlanDetail }>(`/api/plans/${id}`);
      set({
        planDetail: data.plan,
        currentTimelineNode: data.plan.timeline[0] || null,
        loading: { ...get().loading, planDetail: false },
      });
    } catch (e) {
      console.error(e);
      set({ loading: { ...get().loading, planDetail: false } });
    }
  },

  fetchExceptions: async (filters) => {
    set({ loading: { ...get().loading, exceptions: true } });
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.corridorCode) params.set("corridorCode", filters.corridorCode);
      const url = `/api/exceptions${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await apiGet<ListExceptionsResponse>(url);
      set({
        exceptions: data.exceptions,
        filterSnapshot: data.filterSnapshot,
        loading: { ...get().loading, exceptions: false },
      });
    } catch (e) {
      console.error(e);
      set({ loading: { ...get().loading, exceptions: false } });
    }
  },

  fetchSensorDetail: async (id) => {
    set({ loading: { ...get().loading, sensorDetail: true } });
    try {
      const data = await apiGet<{ record: SensorRecord }>(`/api/sensors/${id}`);
      set({
        sensorDetail: data.record,
        showSensorModal: true,
        loading: { ...get().loading, sensorDetail: false },
      });
    } catch (e) {
      console.error(e);
      set({ loading: { ...get().loading, sensorDetail: false } });
    }
  },

  setCurrentTimelineNode: (node) => set({ currentTimelineNode: node }),
  setShowSensorModal: (show) => set({ showSensorModal: show }),
  setShowRejudgeModal: (show, planId) =>
    set({ showRejudgeModal: show, rejudgePlanId: planId ?? null }),

  rejudgePlan: async (planId, data) => {
    set({ loading: { ...get().loading, rejudge: true } });
    try {
      await apiPost(`/api/plans/${planId}/rejudge`, data);
      await get().fetchPlanDetail(planId);
      await get().fetchPlans();
      await get().fetchExceptions();
      set({
        showRejudgeModal: false,
        rejudgePlanId: null,
        loading: { ...get().loading, rejudge: false },
      });
    } catch (e) {
      console.error(e);
      set({ loading: { ...get().loading, rejudge: false } });
    }
  },

  exportExceptions: async (filters) => {
    const params = new URLSearchParams();
    if (filters?.format) params.set("format", filters.format);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.corridorCode) params.set("corridorCode", filters.corridorCode);
    const url = `/api/exceptions/export${params.toString() ? `?${params.toString()}` : ""}`;
    const data = await apiGet<{ downloadUrl: string }>(url);
    return data.downloadUrl;
  },

  clearPlanDetail: () => set({ planDetail: null, currentTimelineNode: null }),
}));
