import { create } from "zustand";
import type {
  AllocationResult,
  AllocationSummary,
  AllocationDiff,
  ImportChangeSummary,
  CorrectionHistory,
  Entry,
} from "../../shared/types";

interface ImportStatus {
  accountCount: number;
  entryCount: number;
  subsidyCount: number;
  refundCount: number;
  latestVersion: string;
}

interface AppState {
  importStatus: ImportStatus | null;
  importLoading: boolean;
  importError: string | null;
  importChangeSummary: ImportChangeSummary | null;

  allocationResults: AllocationResult[];
  allocationSummary: AllocationSummary | null;
  allocationLoading: boolean;
  selectedVersion: string | null;

  correctionLoading: boolean;
  comparisonData: {
    old: AllocationResult[];
    new: AllocationResult[];
    diffs: AllocationDiff[];
  } | null;
  correctionHistory: CorrectionHistory[];

  filterSpotId: string | null;
  filterCardNo: string | null;

  fetchImportStatus: () => Promise<void>;
  importAccounts: (file: File) => Promise<void>;
  importEntries: (file: File) => Promise<void>;
  importSubsidies: (file: File) => Promise<void>;
  calculateAllocation: () => Promise<void>;
  fetchAllocationResults: (version?: string) => Promise<void>;
  fetchAllocationSummary: (version?: string) => Promise<void>;
  updateEntry: (
    id: string,
    action: "update" | "delete",
    data?: Partial<Entry>
  ) => Promise<void>;
  addEntry: (entry: Partial<Entry>) => Promise<void>;
  fetchComparison: (oldVersion: string, newVersion: string) => Promise<void>;
  fetchCorrectionHistory: () => Promise<void>;
  setFilterSpotId: (id: string | null) => void;
  setFilterCardNo: (no: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  importStatus: null,
  importLoading: false,
  importError: null,
  importChangeSummary: null,

  allocationResults: [],
  allocationSummary: null,
  allocationLoading: false,
  selectedVersion: null,

  correctionLoading: false,
  comparisonData: null,
  correctionHistory: [],

  filterSpotId: null,
  filterCardNo: null,

  fetchImportStatus: async () => {
    try {
      set({ importLoading: true, importError: null });
      const res = await fetch("/api/import/status");
      if (!res.ok) throw new Error("获取导入状态失败");
      const data = await res.json();
      set({ importStatus: data, importLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message, importLoading: false });
    }
  },

  importAccounts: async (file: File) => {
    try {
      set({ importLoading: true, importError: null });
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/accounts", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("年卡账户导入失败");
      await res.json();
      const statusRes = await fetch("/api/import/status");
      const statusData = await statusRes.json();
      set({ importStatus: statusData, importLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message, importLoading: false });
    }
  },

  importEntries: async (file: File) => {
    try {
      set({ importLoading: true, importError: null });
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/entries", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("入园记录导入失败");
      const data = await res.json();
      const statusRes = await fetch("/api/import/status");
      const statusData = await statusRes.json();
      set({
        importStatus: statusData,
        importLoading: false,
        importChangeSummary: data.changes
          ? {
              added: data.changes.added || 0,
              updated: data.changes.updated || 0,
              removed: data.changes.removed || 0,
              details: [],
            }
          : null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message, importLoading: false });
    }
  },

  importSubsidies: async (file: File) => {
    try {
      set({ importLoading: true, importError: null });
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/subsidies", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("活动补贴导入失败");
      const data = await res.json();
      const statusRes = await fetch("/api/import/status");
      const statusData = await statusRes.json();
      set({
        importStatus: statusData,
        importLoading: false,
        importChangeSummary: data.changes
          ? {
              added: data.changes.added || 0,
              updated: data.changes.updated || 0,
              removed: data.changes.removed || 0,
              details: [],
            }
          : null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message, importLoading: false });
    }
  },

  calculateAllocation: async () => {
    try {
      set({ allocationLoading: true, importError: null });
      const res = await fetch("/api/allocation/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("分摊计算失败");
      const data = await res.json();
      set({
        allocationResults: data.results || [],
        allocationSummary: data.summary || null,
        selectedVersion: data.version || null,
        allocationLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message, allocationLoading: false });
    }
  },

  fetchAllocationResults: async (version?: string) => {
    try {
      set({ allocationLoading: true, importError: null });
      const params = new URLSearchParams();
      if (version) params.set("version", version);
      const res = await fetch(`/api/allocation/results?${params.toString()}`);
      if (!res.ok) throw new Error("获取分摊结果失败");
      const data = await res.json();
      set({
        allocationResults: data.results || [],
        allocationLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message, allocationLoading: false });
    }
  },

  fetchAllocationSummary: async (version?: string) => {
    try {
      const params = new URLSearchParams();
      if (version) params.set("version", version);
      const res = await fetch(
        `/api/allocation/summary?${params.toString()}`
      );
      if (!res.ok) throw new Error("获取分摊汇总失败");
      const data = await res.json();
      set({ allocationSummary: data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message });
    }
  },

  updateEntry: async (
    id: string,
    action: "update" | "delete",
    data?: Partial<Entry>
  ) => {
    try {
      set({ correctionLoading: true, importError: null });
      const res = await fetch(`/api/correction/entry/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      if (!res.ok) throw new Error("修正入园记录失败");
      set({ correctionLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message, correctionLoading: false });
    }
  },

  addEntry: async (entry: Partial<Entry>) => {
    try {
      set({ correctionLoading: true, importError: null });
      const res = await fetch("/api/correction/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error("新增入园记录失败");
      set({ correctionLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message, correctionLoading: false });
    }
  },

  fetchComparison: async (oldVersion: string, newVersion: string) => {
    try {
      set({ correctionLoading: true, importError: null });
      const params = new URLSearchParams({
        oldVersion,
        newVersion,
      });
      const res = await fetch(
        `/api/correction/compare?${params.toString()}`
      );
      if (!res.ok) throw new Error("获取对比数据失败");
      const data = await res.json();
      set({
        comparisonData: {
          old: data.old || [],
          new: data.new || [],
          diffs: data.diffs || [],
        },
        correctionLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message, correctionLoading: false });
    }
  },

  fetchCorrectionHistory: async () => {
    try {
      const res = await fetch("/api/correction/history");
      if (!res.ok) throw new Error("获取修正历史失败");
      const data = await res.json();
      set({ correctionHistory: data || [] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "未知错误";
      set({ importError: message });
    }
  },

  setFilterSpotId: (id: string | null) => set({ filterSpotId: id }),
  setFilterCardNo: (no: string | null) => set({ filterCardNo: no }),
}));
