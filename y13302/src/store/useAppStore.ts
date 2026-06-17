import { create } from "zustand";
import type {
  AppDataSet,
  WorkOrder,
  ReviewRecord,
  Screenshot,
  SupplementNote,
  DashboardMetrics,
  ImpactAnalysis,
  SourceType,
  OrderStatus,
  ActionType,
} from "@/types";
import { storage } from "@/services/storage";
import { orderService } from "@/services/orderService";
import { reviewService } from "@/services/reviewService";

interface AppState {
  data: AppDataSet;
  selectedOrderId: string | null;
  selectedSourceFilter: SourceType | "all";
  reviewFocusFilter: "all" | "high" | "threshold";

  init: () => void;
  refresh: () => void;
  resetAll: () => void;

  setSelectedOrderId: (id: string | null) => void;
  setSelectedSourceFilter: (f: SourceType | "all") => void;
  setReviewFocusFilter: (f: "all" | "high" | "threshold") => void;

  confirmOrder: (
    id: string,
    confirmedSummary: string,
    operator: string,
    note: string
  ) => void;
  revokeOrder: (
    id: string,
    operator: string,
    note: string
  ) => void;

  addNewOrder: (
    order: Omit<WorkOrder, "id" | "created_at" | "updated_at" | "status">
  ) => WorkOrder;
  addScreenshot: (
    orderId: string,
    url: string,
    description: string
  ) => Screenshot;
  addSupplementNote: (
    orderId: string,
    content: string,
    operator: string
  ) => SupplementNote;

  getMetrics: () => DashboardMetrics;
  getImpactAnalysis: () => ImpactAnalysis[];
  getFilteredOrders: () => WorkOrder[];
}

export const useAppStore = create<AppState>((set, get) => ({
  data: {
    work_orders: [],
    review_records: [],
    screenshots: [],
    supplement_notes: [],
  },
  selectedOrderId: null,
  selectedSourceFilter: "all",
  reviewFocusFilter: "all",

  init: () => {
    const data = storage.ensureInitialized();
    set({ data, selectedOrderId: data.work_orders[0]?.id ?? null });
  },

  refresh: () => {
    const data = storage.load();
    set({ data });
  },

  resetAll: () => {
    const data = storage.reset();
    set({ data, selectedOrderId: data.work_orders[0]?.id ?? null });
  },

  setSelectedOrderId: (id) => set({ selectedOrderId: id }),
  setSelectedSourceFilter: (f) => set({ selectedSourceFilter: f }),
  setReviewFocusFilter: (f) => set({ reviewFocusFilter: f }),

  confirmOrder: (id, confirmedSummary, operator, note) => {
    const order = orderService.getById(id);
    if (!order) return;
    const before = order.status === "confirmed" && order.confirmed_summary
      ? order.confirmed_summary
      : order.model_summary;
    orderService.updateStatus(id, "confirmed", confirmedSummary);
    reviewService.create(
      id,
      before === confirmedSummary ? "confirm" : "modify",
      operator,
      before,
      confirmedSummary,
      note
    );
    get().refresh();
  },

  revokeOrder: (id, operator, note) => {
    const order = orderService.getById(id);
    if (!order) return;
    const before = order.confirmed_summary ?? order.model_summary;
    orderService.revertToPending(id);
    reviewService.create(
      id,
      "revoke" as ActionType,
      operator,
      before,
      order.model_summary,
      note
    );
    get().refresh();
  },

  addNewOrder: (order) => {
    const created = orderService.create(order);
    get().refresh();
    set({ selectedOrderId: created.id });
    return created;
  },

  addScreenshot: (orderId, url, description) => {
    const s = orderService.addScreenshot(orderId, url, description);
    get().refresh();
    return s;
  },

  addSupplementNote: (orderId, content, operator) => {
    const n = orderService.addSupplementNote(orderId, content, operator);
    get().refresh();
    return n;
  },

  getMetrics: () => reviewService.getMetrics(),
  getImpactAnalysis: () => reviewService.getImpactAnalysis(),

  getFilteredOrders: () => {
    const { data, selectedSourceFilter, reviewFocusFilter } = get();
    let list = data.work_orders.slice();
    if (selectedSourceFilter !== "all") {
      list = list.filter((o) => o.source_type === selectedSourceFilter);
    }
    if (reviewFocusFilter === "high") {
      list = list.filter((o) => o.impact_weight >= 1.2);
    } else if (reviewFocusFilter === "threshold") {
      list = list.filter((o) => o.threshold_affected);
    }
    return list.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
}));

export type { OrderStatus };
