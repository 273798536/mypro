import { create } from "zustand";
import {
  NoisePointGroup,
  NameVariant,
  ResidentFeedback,
  Evidence,
  AdjacentRisk,
  HistoryRecord,
  FilterCriteria,
  HistoryAction,
  STATUS_LABEL,
} from "@/types";
import {
  mockNoiseGroups,
  mockNameVariants,
  mockFeedbacks,
  mockEvidences,
  mockAdjacentRisks,
  mockHistoryRecords,
} from "@/data/mock/mockData";
import { createGroupSnapshot } from "@/utils/diffSnapshot";

const STORAGE_KEY = "park-noise-merge-store-v1";

interface AppState {
  groups: NoisePointGroup[];
  variants: NameVariant[];
  feedbacks: ResidentFeedback[];
  evidences: Evidence[];
  adjacentRisks: AdjacentRisk[];
  historyRecords: HistoryRecord[];
  filter: FilterCriteria;
  selectedGroupIds: string[];
  currentOperator: string;
  currentSession: string;

  setFilter: (patch: Partial<FilterCriteria>) => void;
  resetFilter: () => void;
  toggleSelectGroup: (groupId: string) => void;
  clearSelection: () => void;
  selectAllFiltered: (ids: string[]) => void;

  getVariantsByGroup: (groupId: string) => NameVariant[];
  getFeedbacksByGroup: (groupId: string) => ResidentFeedback[];
  getEvidencesByGroup: (groupId: string) => Evidence[];
  getHistoryByGroup: (groupId: string) => HistoryRecord[];
  getRiskPair: (groupId: string) => AdjacentRisk | undefined;
  getGroupById: (groupId: string) => NoisePointGroup | undefined;
  getFeedbackById: (feedbackId: string) => ResidentFeedback | undefined;

  performAction: (params: {
    groupId: string;
    action: HistoryAction;
    remark: string;
    targetGroupId?: string;
  }) => void;
  markRiskReviewed: (riskId: string) => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* ignore */
  }
  return fallback;
}

function persist(partial: Partial<AppState>) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...existing, ...partial })
    );
  } catch (e) {
    /* ignore */
  }
}

const initialFilter: FilterCriteria = {
  statuses: [],
  riskLevels: [],
  dateRange: null,
  operators: [],
  keyword: "",
};

export const useAppStore = create<AppState>((set, get) => {
  const stored = loadFromStorage<Partial<AppState>>(STORAGE_KEY, {});
  return {
    groups: stored.groups ?? mockNoiseGroups,
    variants: stored.variants ?? mockNameVariants,
    feedbacks: stored.feedbacks ?? mockFeedbacks,
    evidences: stored.evidences ?? mockEvidences,
    adjacentRisks: stored.adjacentRisks ?? mockAdjacentRisks,
    historyRecords: stored.historyRecords ?? mockHistoryRecords,
    filter: stored.filter ?? initialFilter,
    selectedGroupIds: [],
    currentOperator: "算法值班-周琳",
    currentSession: "SHIFT-20260616-A",

    setFilter: (patch) =>
      set((s) => {
        const next = { ...s.filter, ...patch };
        persist({ filter: next });
        return { filter: next };
      }),
    resetFilter: () => set({ filter: initialFilter }),
    toggleSelectGroup: (groupId) =>
      set((s) => ({
        selectedGroupIds: s.selectedGroupIds.includes(groupId)
          ? s.selectedGroupIds.filter((id) => id !== groupId)
          : [...s.selectedGroupIds, groupId],
      })),
    clearSelection: () => set({ selectedGroupIds: [] }),
    selectAllFiltered: (ids) => set({ selectedGroupIds: ids }),

    getVariantsByGroup: (groupId) =>
      get().variants.filter((v) => v.groupId === groupId),
    getFeedbacksByGroup: (groupId) => {
      const variantIds = new Set(
        get()
          .getVariantsByGroup(groupId)
          .map((v) => v.feedbackId)
      );
      return get().feedbacks.filter((f) => variantIds.has(f.feedbackId));
    },
    getEvidencesByGroup: (groupId) =>
      get().evidences.filter((e) => e.groupId === groupId),
    getHistoryByGroup: (groupId) =>
      get()
        .historyRecords.filter((h) => h.groupId === groupId)
        .sort(
          (a, b) =>
            new Date(b.operateTime).getTime() -
            new Date(a.operateTime).getTime()
        ),
    getRiskPair: (groupId) =>
      get().adjacentRisks.find(
        (r) => r.groupA === groupId || r.groupB === groupId
      ),
    getGroupById: (groupId) => get().groups.find((g) => g.groupId === groupId),
    getFeedbackById: (feedbackId) =>
      get().feedbacks.find((f) => f.feedbackId === feedbackId),

    performAction: ({ groupId, action, remark, targetGroupId }) => {
      const state = get();
      const group = state.groups.find((g) => g.groupId === groupId);
      if (!group) return;
      const variantsBefore = state.getVariantsByGroup(groupId);
      const beforeSnapshot = createGroupSnapshot(group, variantsBefore);

      let nextStatus = group.status;
      let nextCanonical = group.canonicalName;
      let extraAfterPatch: Partial<NoisePointGroup> = {};

      if (action === "confirm") nextStatus = "merged";
      if (action === "doubt") nextStatus = "doubtful";
      if (action === "return") nextStatus = "pending";
      if (action === "split") nextStatus = "doubtful";
      if (action === "merge" && targetGroupId) {
        nextStatus = "merged";
      }

      const updatedGroup: NoisePointGroup = {
        ...group,
        status: nextStatus,
        canonicalName: nextCanonical,
        updatedAt: new Date().toISOString(),
        ...extraAfterPatch,
      };

      const groupsAfter = state.groups.map((g) =>
        g.groupId === groupId ? updatedGroup : g
      );
      const variantsAfter = state.getVariantsByGroup(groupId);
      const afterSnapshot = createGroupSnapshot(updatedGroup, variantsAfter);

      const nextRecord: HistoryRecord = {
        recordId: `H${Date.now()}`,
        groupId,
        operator: state.currentOperator,
        action,
        beforeState: beforeSnapshot,
        afterState: afterSnapshot,
        remark: remark || `执行操作：${STATUS_LABEL[nextStatus] || action}`,
        operateTime: new Date().toISOString(),
        sessionId: state.currentSession,
      };

      const nextState = {
        groups: groupsAfter,
        historyRecords: [...state.historyRecords, nextRecord],
      };
      persist(nextState);
      set(nextState);
    },

    markRiskReviewed: (riskId) =>
      set((s) => {
        const next = {
          adjacentRisks: s.adjacentRisks.map((r) =>
            r.riskId === riskId ? { ...r, reviewed: true } : r
          ),
        };
        persist(next);
        return next;
      }),
  };
});
