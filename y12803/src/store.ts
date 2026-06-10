import { create } from "zustand";
import { apiFetch } from "@/lib/utils";

export interface ExperimentGroup {
  id: string;
  name: string;
  description: string;
  plantCount: number;
  lastMeasuredAt: string;
  conclusionStatus: "normal" | "abnormal" | "pending";
  conclusion?: string;
  createdAt: string;
}

export interface GrowthMeasurement {
  id: string;
  groupId: string;
  plantId: string;
  measuredAt: string;
  dayIndex: number;
  height: number;
  leafArea: number;
  stemDiameter: number;
  annotation: "normal" | "abnormal" | "pending";
  recordId: string;
  batchNo: string;
  plantCode?: string;
}

export interface CultivationRecord {
  id: string;
  groupId: string;
  plantId: string;
  batchNo: string;
  recordedAt: string;
  measuredAt: string;
  temperature: number;
  humidity: number;
  lightIntensity: number;
  nutrientSolution: string;
  isSupplementary: boolean;
  supplementaryTo?: string;
  note?: string;
  plantCode?: string;
  species?: string;
  groupName?: string;
}

export interface DuplicateConflict {
  existingId: string;
  plantId: string;
  measuredAt: string;
  batchNo: string;
}

export interface QCSummary {
  totalRecords: number;
  abnormalRate: number;
  missingRate: number;
  annotationCompleteness: number;
  monthlyTrend: { month: string; abnormalRate: number; missingRate: number }[];
}

export interface BatchTrace {
  batchNo: string;
  records: CultivationRecord[];
  measurements: GrowthMeasurement[];
  conclusions: Array<{ id: string; name: string; conclusionStatus: string; conclusion: string | null }>;
}

interface CurveData {
  group: ExperimentGroup;
  curves: Array<{
    plantId: string;
    plantCode: string;
    species: string | null;
    measurements: GrowthMeasurement[];
  }>;
}

interface AppState {
  groups: ExperimentGroup[];
  groupsLoading: boolean;
  currentGroup: ExperimentGroup | null;
  curves: GrowthMeasurement[];
  curvePlants: CurveData["curves"];
  records: CultivationRecord[];
  qcSummary: QCSummary | null;
  duplicateConflicts: DuplicateConflict[];
  seedStatus: boolean;

  fetchGroups: () => Promise<void>;
  fetchGroup: (id: string) => Promise<void>;
  fetchCurves: (groupId: string) => Promise<void>;
  fetchConclusion: (groupId: string) => Promise<void>;
  fetchRecords: (params?: Record<string, string>) => Promise<void>;
  createRecord: (record: Partial<CultivationRecord>) => Promise<boolean>;
  fetchBatchTrace: (batchNo: string) => Promise<BatchTrace>;
  fetchQCSummary: () => Promise<void>;
  importJSON: (data: string) => Promise<{ inserted: number; skipped: number; conflicts: DuplicateConflict[] }>;
  importCSV: (file: File) => Promise<{ inserted: number; skipped: number; conflicts: DuplicateConflict[] }>;
  checkDuplicates: (records: Partial<CultivationRecord>[]) => Promise<void>;
  resolveConflict: (strategy: "overwrite" | "skip" | "merge", record: Partial<CultivationRecord>) => Promise<void>;
  checkSeedStatus: () => Promise<void>;
  initSeed: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  groups: [],
  groupsLoading: false,
  currentGroup: null,
  curves: [],
  curvePlants: [],
  records: [],
  qcSummary: null,
  duplicateConflicts: [],
  seedStatus: false,

  fetchGroups: async () => {
    set({ groupsLoading: true });
    try {
      const data = await apiFetch<ExperimentGroup[]>("/api/groups");
      set({ groups: data, groupsLoading: false });
    } catch {
      set({ groupsLoading: false });
    }
  },

  fetchGroup: async (id) => {
    try {
      const data = await apiFetch<ExperimentGroup & { plants: unknown[] }>("/api/groups/" + id);
      set({ currentGroup: data });
    } catch {
      set({ currentGroup: null });
    }
  },

  fetchCurves: async (groupId) => {
    try {
      const data = await apiFetch<CurveData>("/api/groups/" + groupId + "/curves");
      const allMeasurements: GrowthMeasurement[] = [];
      for (const plant of data.curves) {
        allMeasurements.push(...plant.measurements);
      }
      set({ curves: allMeasurements, curvePlants: data.curves, currentGroup: data.group });
    } catch {
      set({ curves: [], curvePlants: [] });
    }
  },

  fetchConclusion: async (groupId) => {
    try {
      const data = await apiFetch<ExperimentGroup>("/api/groups/" + groupId + "/conclusion");
      const current = get().currentGroup;
      if (current && current.id === groupId) {
        set({ currentGroup: { ...current, ...data } });
      }
    } catch {}
  },

  fetchRecords: async (params) => {
    try {
      const query = params ? "?" + new URLSearchParams(params).toString() : "";
      const data = await apiFetch<CultivationRecord[]>("/api/records" + query);
      set({ records: data });
    } catch {
      set({ records: [] });
    }
  },

  createRecord: async (record) => {
    try {
      await apiFetch<unknown>("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: record.groupId,
          plant_id: record.plantId,
          batch_no: record.batchNo,
          recorded_at: record.recordedAt,
          measured_at: record.measuredAt,
          temperature: record.temperature,
          humidity: record.humidity,
          light_intensity: record.lightIntensity,
          nutrient_solution: record.nutrientSolution,
          is_supplementary: record.isSupplementary ? 1 : 0,
          supplementary_to: record.supplementaryTo ?? null,
          note: record.note ?? null,
        }),
      });
      await get().fetchRecords();
      return true;
    } catch {
      return false;
    }
  },

  fetchBatchTrace: async (batchNo) => {
    return apiFetch<BatchTrace>("/api/records/batch/" + encodeURIComponent(batchNo));
  },

  fetchQCSummary: async () => {
    try {
      const data = await apiFetch<QCSummary>("/api/qc/summary");
      set({ qcSummary: data });
    } catch {
      set({ qcSummary: null });
    }
  },

  importJSON: async (data) => {
    const result = await apiFetch<{
      totalRows: number;
      insertedRows: number;
      skippedRows: number;
      conflicts: DuplicateConflict[];
    }>("/api/import/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data,
    });
    return { inserted: result.insertedRows, skipped: result.skippedRows, conflicts: result.conflicts ?? [] };
  },

  importCSV: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const result = await apiFetch<{
      totalRows: number;
      insertedRows: number;
      skippedRows: number;
      conflicts: DuplicateConflict[];
    }>("/api/import/csv", {
      method: "POST",
      body: formData,
    });
    return { inserted: result.insertedRows, skipped: result.skippedRows, conflicts: result.conflicts ?? [] };
  },

  checkDuplicates: async (records) => {
    try {
      const data = await apiFetch<{ conflictCount: number; conflicts: DuplicateConflict[] }>("/api/import/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(records),
      });
      set({ duplicateConflicts: data.conflicts ?? [] });
    } catch {
      set({ duplicateConflicts: [] });
    }
  },

  resolveConflict: async (strategy, record) => {
    await apiFetch<unknown>("/api/import/resolve-conflict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        strategy,
        record: {
          group_id: record.groupId,
          plant_id: record.plantId,
          batch_no: record.batchNo,
          recorded_at: record.recordedAt,
          measured_at: record.measuredAt,
          temperature: record.temperature,
          humidity: record.humidity,
          light_intensity: record.lightIntensity,
          nutrient_solution: record.nutrientSolution,
          is_supplementary: record.isSupplementary ? 1 : 0,
          supplementary_to: record.supplementaryTo ?? null,
          note: record.note ?? null,
        },
      }),
    });
  },

  checkSeedStatus: async () => {
    try {
      const data = await apiFetch<{ seeded: boolean }>("/api/seed/status");
      set({ seedStatus: data.seeded ?? false });
    } catch {
      set({ seedStatus: false });
    }
  },

  initSeed: async () => {
    try {
      await apiFetch<unknown>("/api/seed", { method: "POST" });
      set({ seedStatus: true });
    } catch {}
  },
}));
