import { create } from "zustand";

export interface SourceMaterial {
  id: string;
  title: string;
  type: "score" | "annotation" | "note";
  version: string;
  content: string;
  sourceFile: string;
  createdAt: string;
  relatedAnnotations: string[];
  relatedVersions: string[];
}

export interface AliasGroup {
  id: string;
  standardName: string;
  aliases: string[];
  versions: string[];
  normalized: boolean;
}

export interface ChangeSnapshot {
  id: string;
  timestamp: string;
  operationType: "normalize" | "rollback" | "update";
  affectedGroupId: string;
  affectedGroupName: string;
  reason: string;
  oldValue: string;
  newValue: string;
}

export type DiffType = "alias" | "misalignment" | "mixing";

export interface DiffEntry {
  lineIndex: number;
  leftContent: string;
  rightContent: string;
  diffType: DiffType;
}

export interface ComparisonResult {
  leftVersion: string;
  rightVersion: string;
  leftContent: string;
  rightContent: string;
  diffs: DiffEntry[];
  summary: {
    aliasCount: number;
    misalignmentCount: number;
    mixingCount: number;
  };
}

export interface SearchHit {
  id: string;
  materialId: string;
  materialTitle: string;
  version: string;
  snippet: string;
  position: number;
  type: "score" | "annotation" | "note";
}

export interface ExportMapping {
  score: string;
  annotation: string;
  report: string;
}

export interface ExportData {
  report: string;
  mappings: ExportMapping[];
  diffSnapshots: Record<string, unknown>[];
}

function mapMaterial(raw: Record<string, unknown>): SourceMaterial {
  return {
    id: String(raw.id),
    title: String(raw.title),
    type: String(raw.type) as SourceMaterial["type"],
    version: String(raw.version),
    content: String(raw.content),
    sourceFile: String(raw.source_file),
    createdAt: String(raw.created_at),
    relatedAnnotations: [],
    relatedVersions: [],
  };
}

interface AppState {
  materials: SourceMaterial[];
  materialsLoading: boolean;

  aliasGroups: AliasGroup[];
  aliasGroupsLoading: boolean;

  changeHistory: ChangeSnapshot[];
  changeHistoryLoading: boolean;

  comparisonResult: ComparisonResult | null;
  comparisonLoading: boolean;

  searchResults: SearchHit[];
  searchLoading: boolean;

  exportData: ExportData | null;
  exportLoading: boolean;

  fetchMaterials: () => Promise<void>;
  fetchAliasGroups: () => Promise<void>;
  fetchChangeHistory: () => Promise<void>;
  normalizeGroup: (groupId: string, targetName: string, reason: string) => Promise<void>;
  rollbackSnapshot: (snapshotId: string) => Promise<void>;
  runComparison: (leftVersion: string, rightVersion: string) => Promise<void>;
  runSearch: (keyword: string, filters?: { version?: string; type?: string }) => Promise<void>;
  runExport: (options: { includeMapping: boolean; includeDiff: boolean }) => Promise<void>;
  updateMaterial: (id: string, data: Partial<SourceMaterial> & { reason?: string }) => Promise<void>;
  addMaterial: (material: { title: string; type: SourceMaterial["type"]; version: string; content: string; sourceFile: string }) => Promise<void>;
  fetchMaterialDetail: (id: string) => Promise<Record<string, unknown>>;
}

export const useStore = create<AppState>((set, get) => ({
  materials: [],
  materialsLoading: false,

  aliasGroups: [],
  aliasGroupsLoading: false,

  changeHistory: [],
  changeHistoryLoading: false,

  comparisonResult: null,
  comparisonLoading: false,

  searchResults: [],
  searchLoading: false,

  exportData: null,
  exportLoading: false,

  fetchMaterials: async () => {
    set({ materialsLoading: true });
    try {
      const res = await fetch("/api/materials");
      if (res.ok) {
        const json = await res.json();
        const rawList: Record<string, unknown>[] = json.data || json;
        const materials = rawList.map(mapMaterial);
        set({ materials, materialsLoading: false });
      } else {
        set({ materialsLoading: false });
      }
    } catch {
      set({ materialsLoading: false });
    }
  },

  fetchAliasGroups: async () => {
    set({ aliasGroupsLoading: true });
    try {
      const res = await fetch("/api/normalization/groups");
      if (res.ok) {
        const json = await res.json();
        const rawList: Record<string, unknown>[] = json.data || [];
        const aliasGroups: AliasGroup[] = rawList.map((r) => ({
          id: String(r.group_id),
          standardName: String(r.standard_name),
          aliases: String(r.aliases ?? "").split(",").filter(Boolean),
          versions: String(r.versions ?? "").split(",").filter(Boolean),
          normalized: r.normalized === 1 || r.normalized === true,
        }));
        set({ aliasGroups, aliasGroupsLoading: false });
      } else {
        set({ aliasGroupsLoading: false });
      }
    } catch {
      set({ aliasGroupsLoading: false });
    }
  },

  fetchChangeHistory: async () => {
    set({ changeHistoryLoading: true });
    try {
      const res = await fetch("/api/normalization/history");
      if (res.ok) {
        const json = await res.json();
        const rawList: Record<string, unknown>[] = json.data || [];
        const changeHistory: ChangeSnapshot[] = rawList.map((r) => ({
          id: String(r.id),
          timestamp: String(r.created_at),
          operationType: String(r.reason ?? "").includes("回滚") ? "rollback" as const : "normalize" as const,
          affectedGroupId: String(r.entity_id),
          affectedGroupName: String(r.field),
          reason: String(r.reason ?? ""),
          oldValue: String(r.old_value),
          newValue: String(r.new_value),
        }));
        set({ changeHistory, changeHistoryLoading: false });
      } else {
        set({ changeHistoryLoading: false });
      }
    } catch {
      set({ changeHistoryLoading: false });
    }
  },

  normalizeGroup: async (groupId, targetName, reason) => {
    try {
      const res = await fetch("/api/normalization/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId, standard_name: targetName, reason }),
      });
      if (res.ok) {
        await get().fetchAliasGroups();
        await get().fetchChangeHistory();
      }
    } catch {
      // handled silently
    }
  },

  rollbackSnapshot: async (snapshotId) => {
    try {
      const res = await fetch(`/api/normalization/rollback/${snapshotId}`, {
        method: "POST",
      });
      if (res.ok) {
        await get().fetchAliasGroups();
        await get().fetchChangeHistory();
      }
    } catch {
      // handled silently
    }
  },

  runComparison: async (leftVersion, rightVersion) => {
    set({ comparisonLoading: true });
    try {
      const res = await fetch("/api/comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_version: leftVersion, target_version: rightVersion }),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        set({ comparisonResult: data as ComparisonResult, comparisonLoading: false });
      } else {
        set({ comparisonLoading: false });
      }
    } catch {
      set({ comparisonLoading: false });
    }
  },

  runSearch: async (keyword, filters) => {
    set({ searchLoading: true });
    try {
      const body: Record<string, unknown> = { query: keyword };
      if (filters?.version) body.versions = [filters.version];
      if (filters?.type) body.types = [filters.type];

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = await res.json();
        const rawList: Record<string, unknown>[] = json.data || [];
        const searchResults: SearchHit[] = rawList.map((r, idx: number) => ({
          id: String(r.id) + idx,
          materialId: String(r.id),
          materialTitle: String(r.title),
          version: String(r.version),
          snippet: String(r.content).substring(0, 200),
          position: idx,
          type: String(r.type) as SearchHit["type"],
        }));
        set({ searchResults, searchLoading: false });
      } else {
        set({ searchLoading: false });
      }
    } catch {
      set({ searchLoading: false });
    }
  },

  runExport: async (options) => {
    set({ exportLoading: true });
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          include_mapping: options.includeMapping,
          include_diff: options.includeDiff,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        set({
          exportData: {
            report: String(data.report || ""),
            mappings: (data.mappings || []) as ExportMapping[],
            diffSnapshots: (data.diffSnapshots || []) as Record<string, unknown>[],
          },
          exportLoading: false,
        });
      } else {
        set({ exportLoading: false });
      }
    } catch {
      set({ exportLoading: false });
    }
  },

  updateMaterial: async (id, data) => {
    try {
      const body: Record<string, unknown> = {};
      if (data.title !== undefined) body.title = data.title;
      if (data.content !== undefined) body.content = data.content;
      if (data.sourceFile !== undefined) body.source_file = data.sourceFile;
      if (data.version !== undefined) body.version = data.version;
      if (data.type !== undefined) body.type = data.type;
      if (data.reason) body.reason = data.reason;

      const res = await fetch(`/api/materials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        const updated = mapMaterial((json.data || json) as Record<string, unknown>);
        set((state) => ({
          materials: state.materials.map((m) => (m.id === id ? { ...m, ...updated } : m)),
        }));
      }
    } catch {
      // handled silently
    }
  },

  addMaterial: async (material) => {
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: material.type,
          title: material.title,
          content: material.content,
          source_file: material.sourceFile,
          version: material.version,
        }),
      });

      if (res.ok) {
        await get().fetchMaterials();
      }
    } catch {
      // handled silently
    }
  },

  fetchMaterialDetail: async (id) => {
    try {
      const res = await fetch(`/api/materials/${id}`);
      if (res.ok) {
        const json = await res.json();
        return (json.data || json) as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  },
}));
