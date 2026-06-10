import { create } from "zustand";
import type {
  Batch,
  ReadQuality,
  Anomaly,
  CultureRecord,
  ProcessingRecord,
  ReportPreview,
  ReviewAction,
  CultureRecordVersion,
  VersionDiff,
} from "@/types";

interface AppState {
  batches: Batch[];
  currentBatch: Batch | null;
  reads: ReadQuality[];
  selectedRead: ReadQuality | null;
  anomalies: Anomaly[];
  currentAnomaly: Anomaly | null;
  cultureRecords: CultureRecord[];
  currentCulture: CultureRecord | null;
  cultureVersions: CultureRecordVersion[];
  versionDiff: VersionDiff | null;
  processingRecords: ProcessingRecord[];
  reportPreview: ReportPreview | null;
  loading: boolean;
  error: string | null;

  fetchBatches: (status?: string) => Promise<void>;
  fetchBatch: (id: string) => Promise<void>;
  createBatch: (name: string) => Promise<void>;
  fetchReads: (batchId: string, lowQuality?: boolean) => Promise<void>;
  fetchRead: (readId: string) => Promise<void>;
  selectRead: (read: ReadQuality | null) => void;
  fetchAnomalies: (status?: string) => Promise<void>;
  fetchAnomaly: (id: string) => Promise<void>;
  createAnomaly: (readId: string, batchId: string, createdBy: string, cultureRecordId?: string) => Promise<void>;
  submitReview: (anomalyId: string, action: "approve" | "reject", reason: string, operator: string) => Promise<void>;
  fetchCultureRecords: () => Promise<void>;
  fetchCultureRecord: (id: string) => Promise<void>;
  createCultureRecord: (sampleId: string, conclusion: string, updatedBy: string) => Promise<void>;
  updateCultureRecord: (
    id: string,
    conclusion: string,
    changedBy: string,
    changeReason: string,
    batchId?: string,
    anomalyId?: string,
  ) => Promise<void>;
  fetchCultureVersions: (id: string) => Promise<void>;
  fetchVersionDiff: (id: string, v1: number, v2: number) => Promise<void>;
  fetchProcessingRecords: (batchId: string) => Promise<void>;
  fetchReportPreview: (batchId: string) => Promise<void>;
  downloadReport: (batchId: string) => Promise<void>;
  clearError: () => void;
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "请求失败");
  return json.data as T;
}

export const useStore = create<AppState>((set, get) => ({
  batches: [],
  currentBatch: null,
  reads: [],
  selectedRead: null,
  anomalies: [],
  currentAnomaly: null,
  cultureRecords: [],
  currentCulture: null,
  cultureVersions: [],
  versionDiff: null,
  processingRecords: [],
  reportPreview: null,
  loading: false,
  error: null,

  fetchBatches: async (status?: string) => {
    set({ loading: true, error: null });
    try {
      const url = status ? `/api/batches?status=${status}` : "/api/batches";
      const data = await api<Batch[]>(url);
      set({ batches: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchBatch: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api<Batch>(`/api/batches/${id}`);
      set({ currentBatch: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createBatch: async (name: string) => {
    set({ loading: true, error: null });
    try {
      await api<Batch>("/api/batches", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await get().fetchBatches();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchReads: async (batchId: string, lowQuality?: boolean) => {
    set({ loading: true, error: null });
    try {
      const url = lowQuality
        ? `/api/batches/${batchId}/reads?lowQuality=true`
        : `/api/batches/${batchId}/reads`;
      const data = await api<ReadQuality[]>(url);
      set({ reads: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchRead: async (readId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api<ReadQuality>(`/api/reads/${readId}`);
      set({ selectedRead: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  selectRead: (read: ReadQuality | null) => set({ selectedRead: read }),

  fetchAnomalies: async (status?: string) => {
    set({ loading: true, error: null });
    try {
      const url = status ? `/api/anomalies?status=${status}` : "/api/anomalies";
      const data = await api<Anomaly[]>(url);
      set({ anomalies: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchAnomaly: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api<Anomaly>(`/api/anomalies/${id}`);
      set({ currentAnomaly: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createAnomaly: async (readId, batchId, createdBy, cultureRecordId) => {
    set({ loading: true, error: null });
    try {
      await api<Anomaly>("/api/anomalies", {
        method: "POST",
        body: JSON.stringify({ readId, batchId, createdBy, cultureRecordId }),
      });
      await get().fetchReads(batchId);
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  submitReview: async (anomalyId, action, reason, operator) => {
    set({ loading: true, error: null });
    try {
      await api<ReviewAction>(`/api/anomalies/${anomalyId}/review`, {
        method: "POST",
        body: JSON.stringify({ action, reason, operator }),
      });
      const current = get().currentAnomaly;
      if (current) {
        await get().fetchAnomaly(current.id);
      }
      await get().fetchAnomalies();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchCultureRecords: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api<CultureRecord[]>("/api/cultures");
      set({ cultureRecords: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchCultureRecord: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api<CultureRecord>(`/api/cultures/${id}`);
      set({ currentCulture: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createCultureRecord: async (sampleId, conclusion, updatedBy) => {
    set({ loading: true, error: null });
    try {
      await api<CultureRecord>("/api/cultures", {
        method: "POST",
        body: JSON.stringify({ sampleId, conclusion, updatedBy, changeReason: "初始创建" }),
      });
      await get().fetchCultureRecords();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  updateCultureRecord: async (id, conclusion, changedBy, changeReason, batchId, anomalyId) => {
    set({ loading: true, error: null });
    try {
      const body: any = { conclusion, changedBy, changeReason };
      if (batchId) body.batchId = batchId;
      if (anomalyId) body.anomalyId = anomalyId;
      await api<CultureRecord>(`/api/cultures/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await get().fetchCultureRecord(id);
      await get().fetchCultureRecords();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchCultureVersions: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api<CultureRecordVersion[]>(`/api/cultures/${id}/versions`);
      set({ cultureVersions: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchVersionDiff: async (id, v1, v2) => {
    set({ loading: true, error: null });
    try {
      const data = await api<VersionDiff>(`/api/cultures/${id}/diff?v1=${v1}&v2=${v2}`);
      set({ versionDiff: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchProcessingRecords: async (batchId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api<ProcessingRecord[]>(`/api/processing-records/${batchId}`);
      set({ processingRecords: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchReportPreview: async (batchId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api<ReportPreview>(`/api/reports/preview/${batchId}`);
      set({ reportPreview: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  downloadReport: async (batchId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/reports/download/${batchId}`);
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `MCS_${batchId}_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
