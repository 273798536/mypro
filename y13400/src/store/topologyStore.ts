import { create } from "zustand";
import type {
  TopologyRecord,
  FilterState,
  ProcessingStatus,
  RunHistory,
  ScreenshotRef,
} from "../types/topology";
import { rawRecords, alerts, batchInfo } from "../data/mockData";
import type { AlertItem, BatchInfo } from "../types/topology";

interface TopologyState {
  records: TopologyRecord[];
  filters: FilterState;
  alerts: AlertItem[];
  batchInfo: BatchInfo;
  expandedRecordId: string | null;
  selectedRecordIds: string[];
  currentOperator: string;
  setFilters: (patch: Partial<FilterState>) => void;
  resetFilters: () => void;
  toggleExpand: (id: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  updateManualNote: (id: string, note: string) => void;
  updateStatus: (id: string, status: ProcessingStatus) => void;
  addReRun: (
    id: string,
    note: string,
    status: ProcessingStatus,
    screenshots: ScreenshotRef[],
    diffSummary?: string
  ) => void;
  getFilteredRecords: () => TopologyRecord[];
  exportCSV: () => string;
}

const defaultFilters: FilterState = {
  keyword: "",
  status: "all",
  changeSource: "all",
  parameterVersion: "all",
  hasLateAttachment: "all",
  hasNoConflict: "all",
  materialBatch: "all",
};

export const useTopologyStore = create<TopologyState>((set, get) => ({
  records: rawRecords,
  filters: defaultFilters,
  alerts,
  batchInfo,
  expandedRecordId: null,
  selectedRecordIds: [],
  currentOperator: "复核人-刘老师",

  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch } })),

  resetFilters: () => set({ filters: defaultFilters }),

  toggleExpand: (id) =>
    set((s) => ({ expandedRecordId: s.expandedRecordId === id ? null : id })),

  toggleSelect: (id) =>
    set((s) => ({
      selectedRecordIds: s.selectedRecordIds.includes(id)
        ? s.selectedRecordIds.filter((x) => x !== id)
        : [...s.selectedRecordIds, id],
    })),

  selectAll: (ids) => set({ selectedRecordIds: ids }),

  clearSelection: () => set({ selectedRecordIds: [] }),

  updateManualNote: (id, note) =>
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, manualNote: note } : r)),
    })),

  updateStatus: (id, status) =>
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, status } : r)),
    })),

  addReRun: (id, note, status, screenshots, diffSummary) => {
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    set((s) => ({
      records: s.records.map((r) => {
        if (r.id !== id) return r;
        const seq = r.runHistory.length + 1;
        const base = r.runHistory[0]?.runId || `RUN-${r.id.slice(2)}`;
        const newRun: RunHistory = {
          runId: `${base}-R${seq}`,
          runAt: ts,
          operator: s.currentOperator,
          status,
          note,
          screenshots,
          diffSummary,
        };
        return {
          ...r,
          status,
          manualNote: note || r.manualNote,
          runHistory: [...r.runHistory, newRun],
        };
      }),
    }));
  },

  getFilteredRecords: () => {
    const { records, filters } = get();
    const kw = filters.keyword.trim().toLowerCase();
    return records.filter((r) => {
      if (kw) {
        const hay = [
          r.sampleNo,
          r.declaredSampleNo,
          r.pathCode,
          r.topologyName,
          r.materialBatch,
          r.operator,
          r.fieldNotes,
          r.manualNote,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.changeSource !== "all" && r.changeSource !== filters.changeSource)
        return false;
      if (filters.parameterVersion !== "all" && r.parameterVersion !== filters.parameterVersion)
        return false;
      if (filters.hasLateAttachment !== "all") {
        const has = r.attachments.some((a) => a.type === "late");
        if (filters.hasLateAttachment && !has) return false;
        if (!filters.hasLateAttachment && has) return false;
      }
      if (filters.hasNoConflict !== "all") {
        const conflict = r.sampleNo !== r.declaredSampleNo;
        if (filters.hasNoConflict && conflict) return false;
        if (!filters.hasNoConflict && !conflict) return false;
      }
      if (filters.materialBatch !== "all" && r.materialBatch !== filters.materialBatch)
        return false;
      return true;
    });
  },

  exportCSV: () => {
    const records = get().getFilteredRecords();
    const headers = [
      "记录ID",
      "样本编号",
      "登记编号",
      "编号一致",
      "路径代码",
      "拓扑名称",
      "实测值",
      "单位",
      "参考值",
      "偏差",
      "偏差率(%)",
      "实际参数版本",
      "登记参数版本",
      "参数版本一致",
      "采集时间",
      "到场时间",
      "处理状态",
      "变化来源",
      "变化说明",
      "人工备注",
      "材料批次",
      "操作人",
      "附件数量",
      "晚到附件",
      "重跑次数",
    ];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = records.map((r) => [
      r.id,
      r.sampleNo,
      r.declaredSampleNo,
      r.sampleNo === r.declaredSampleNo ? "是" : "否",
      r.pathCode,
      r.topologyName,
      r.measuredValue,
      r.unit,
      r.referenceValue,
      r.deviation,
      r.deviationPct.toFixed(2),
      r.parameterVersion,
      r.declaredParameterVersion,
      r.parameterVersion === r.declaredParameterVersion ? "是" : "否",
      r.collectedAt,
      r.receivedAt,
      statusLabel(r.status),
      changeSourceLabel(r.changeSource),
      r.changeExplanation,
      r.manualNote,
      r.materialBatch,
      r.operator,
      r.attachments.length,
      r.attachments.some((a) => a.type === "late") ? "有" : "无",
      Math.max(0, r.runHistory.length - 1),
    ]);
    return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  },
}));

export function statusLabel(s: ProcessingStatus): string {
  return (
    {
      pending: "待复核",
      verified: "已通过",
      warning: "需关注",
      error: "有问题",
      re_run: "待重跑",
    } as const
  )[s];
}

export function statusColor(s: ProcessingStatus): string {
  return (
    {
      pending: "bg-slate-100 text-slate-700 ring-slate-200",
      verified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      warning: "bg-amber-50 text-amber-700 ring-amber-200",
      error: "bg-rose-50 text-rose-700 ring-rose-200",
      re_run: "bg-sky-50 text-sky-700 ring-sky-200",
    } as const
  )[s];
}

export function changeSourceLabel(s: string): string {
  return (
    {
      unit: "单位换算",
      parameter: "参数版本",
      sample: "样本本身",
      unknown: "待确认",
      all: "全部",
    } as Record<string, string>
  )[s] || s;
}

export function changeSourceColor(s: string): string {
  return (
    {
      unit: "bg-violet-50 text-violet-700 ring-violet-200",
      parameter: "bg-cyan-50 text-cyan-700 ring-cyan-200",
      sample: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      unknown: "bg-slate-100 text-slate-600 ring-slate-200",
    } as Record<string, string>
  )[s] || "bg-slate-100 text-slate-600 ring-slate-200";
}
