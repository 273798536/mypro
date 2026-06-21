import { create } from "zustand";
import type { ConclusionKey, DecisionCategoryKey, PollutionKey } from "@/utils/constants";
import type { DashboardFilters, DecisionItem, Sample } from "@/utils/types";
import { SAMPLES } from "@/mock/samples";
import { GRAY_CONFIGS } from "@/mock/grayscales";
import { VERSIONS } from "@/mock/versions";

interface DashboardState {
  allSamples: Sample[];
  filters: DashboardFilters;
  decisionItems: DecisionItem[];
  versions: typeof VERSIONS;
  grayConfigs: typeof GRAY_CONFIGS;
  getFilteredSamples: () => Sample[];
  setVersion: (v: string | null) => void;
  setGrayConfig: (g: string | null) => void;
  togglePollution: (p: PollutionKey) => void;
  toggleConclusion: (c: ConclusionKey) => void;
  setBoundaryOnly: (v: boolean) => void;
  setCoveredOnly: (v: boolean) => void;
  setKeyword: (v: string) => void;
  resetFilters: () => void;
  markDecision: (sampleId: string, category: DecisionCategoryKey, remark: string) => void;
  removeDecision: (id: string) => void;
  getStats: () => {
    pending: number;
    pollution: number;
    manualOverride: number;
    passRate: number;
  };
}

const defaultFilters: DashboardFilters = {
  versionId: null,
  grayConfigId: null,
  pollutionStatuses: [],
  conclusionStatuses: [],
  isBoundaryOnly: false,
  isCoveredByMeanOnly: false,
  dateRange: null,
  keyword: "",
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  allSamples: SAMPLES,
  filters: defaultFilters,
  decisionItems: [
    {
      id: "d-1",
      sampleId: "SPL-20260621-00482",
      category: "NEED_MORE",
      remark: "污染+被均值盖住，补30条真实生产样本",
      createdAt: new Date("2026-06-21T15:22:00Z").toISOString(),
      operator: "小林",
    },
    {
      id: "d-2",
      sampleId: "SPL-20260619-00501",
      category: "NEED_MORE",
      remark: "高置信但验证集污染，需真实样本复核",
      createdAt: new Date("2026-06-19T15:15:00Z").toISOString(),
      operator: "小林",
    },
    {
      id: "d-3",
      sampleId: "SPL-20260620-00955",
      category: "PASSED",
      remark: "各版本评分稳定高于阈值，无异常",
      createdAt: new Date("2026-06-20T16:30:00Z").toISOString(),
      operator: "小林",
    },
    {
      id: "d-4",
      sampleId: "SPL-20260620-00803",
      category: "PASSED",
      remark: "原始分>阈值，平滑窗口问题导致，已人工改判放行",
      createdAt: new Date("2026-06-20T11:15:00Z").toISOString(),
      operator: "小林",
    },
  ],
  versions: VERSIONS,
  grayConfigs: GRAY_CONFIGS,
  getFilteredSamples: () => {
    const { allSamples, filters } = get();
    return allSamples.filter((s) => {
      if (filters.versionId && s.versionId !== filters.versionId) return false;
      if (filters.grayConfigId && s.grayConfigId !== filters.grayConfigId) return false;
      if (filters.pollutionStatuses.length && !filters.pollutionStatuses.includes(s.pollutionStatus)) return false;
      if (filters.conclusionStatuses.length && !filters.conclusionStatuses.includes(s.conclusion)) return false;
      if (filters.isBoundaryOnly && !s.isBoundary) return false;
      if (filters.isCoveredByMeanOnly && !s.coveredByMean) return false;
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const hay = `${s.id} ${s.source} ${s.conclusionReason} ${s.pollutionNote ?? ""}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  },
  setVersion: (v) => set((s) => ({ filters: { ...s.filters, versionId: v } })),
  setGrayConfig: (g) => set((s) => ({ filters: { ...s.filters, grayConfigId: g } })),
  togglePollution: (p) =>
    set((s) => {
      const cur = s.filters.pollutionStatuses;
      return {
        filters: {
          ...s.filters,
          pollutionStatuses: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
        },
      };
    }),
  toggleConclusion: (c) =>
    set((s) => {
      const cur = s.filters.conclusionStatuses;
      return {
        filters: {
          ...s.filters,
          conclusionStatuses: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c],
        },
      };
    }),
  setBoundaryOnly: (v) => set((s) => ({ filters: { ...s.filters, isBoundaryOnly: v } })),
  setCoveredOnly: (v) => set((s) => ({ filters: { ...s.filters, isCoveredByMeanOnly: v } })),
  setKeyword: (v) => set((s) => ({ filters: { ...s.filters, keyword: v } })),
  resetFilters: () => set({ filters: defaultFilters }),
  markDecision: (sampleId, category, remark) =>
    set((s) => ({
      decisionItems: [
        {
          id: `d-${Date.now()}`,
          sampleId,
          category,
          remark,
          createdAt: new Date().toISOString(),
          operator: "小林",
        },
        ...s.decisionItems,
      ],
    })),
  removeDecision: (id) => set((s) => ({ decisionItems: s.decisionItems.filter((d) => d.id !== id) })),
  getStats: () => {
    const { allSamples } = get();
    const pending = allSamples.filter((s) => s.conclusion === "PENDING").length;
    const pollution = allSamples.filter((s) => s.pollutionStatus === "CONFIRMED").length;
    const manualOverride = allSamples.filter((s) => s.conclusion === "MANUAL_OVERRIDDEN").length;
    const decided = allSamples.filter((s) => s.conclusion !== "PENDING").length || 1;
    const passed = allSamples.filter((s) => s.conclusion === "PASSED" || s.conclusion === "MANUAL_OVERRIDDEN").length;
    const passRate = passed / decided;
    return { pending, pollution, manualOverride, passRate };
  },
}));
