import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  IngredientRecord,
  CalculationResult,
  AuditLog,
  ImportBatch,
  VersionConflict,
  RecordStatus,
  ProblemType,
  ConflictResolution,
} from "@/types";

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

interface AppState {
  records: IngredientRecord[];
  results: CalculationResult[];
  auditLogs: AuditLog[];
  batches: ImportBatch[];
  conflicts: VersionConflict[];
  currentUser: string;

  addRecord: (record: Partial<IngredientRecord>) => IngredientRecord;
  updateRecord: (id: string, updates: Partial<IngredientRecord>, note?: string) => void;
  updateRecordStatus: (id: string, status: RecordStatus, note?: string) => void;
  removeRecordProblems: (id: string, problemsToRemove: ProblemType[]) => void;
  addRecordProblem: (id: string, problem: ProblemType) => void;
  deleteRecord: (id: string) => void;

  addResult: (result: Omit<CalculationResult, "id" | "calculatedAt" | "calculatedBy">) => void;
  getResultsByRecordId: (recordId: string) => CalculationResult[];

  addAuditLog: (log: Omit<AuditLog, "id" | "timestamp" | "operator">) => void;
  getAuditLogsByRecordId: (recordId: string) => AuditLog[];

  addBatch: (batch: Omit<ImportBatch, "id" | "importedAt" | "importedBy">) => ImportBatch;
  updateBatch: (id: string, updates: Partial<ImportBatch>) => void;
  getBatchRecords: (batchId: string) => IngredientRecord[];

  importRecords: (
    records: Partial<IngredientRecord>[],
    batchName: string,
    fileName: string
  ) => { batch: ImportBatch; conflicts: VersionConflict[] };

  detectConflicts: (newRecords: IngredientRecord[]) => VersionConflict[];
  resolveConflict: (recordId: string, resolution: ConflictResolution, note?: string) => void;

  getRecordsByProblem: (problem: ProblemType | "all") => IngredientRecord[];
  getRecordsByStatus: (status: RecordStatus) => IngredientRecord[];
  getProblemStats: () => Record<ProblemType | "all", number>;
  getBatchStats: (batchId: string) => {
    total: number;
    confirmed: number;
    pending: number;
    failed: number;
    problems: Record<ProblemType, number>;
  };

  resetAll: () => void;
}

const initialRecords: IngredientRecord[] = [];
const initialResults: CalculationResult[] = [];
const initialAuditLogs: AuditLog[] = [];
const initialBatches: ImportBatch[] = [];
const initialConflicts: VersionConflict[] = [];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      records: initialRecords,
      results: initialResults,
      auditLogs: initialAuditLogs,
      batches: initialBatches,
      conflicts: initialConflicts,
      currentUser: "投研助理-小王",

      addRecord: (record) => {
        const now = new Date().toISOString();
        const newRecord: IngredientRecord = {
          id: generateId(),
          name: record.name ?? "",
          quantity: record.quantity,
          unit: record.unit,
          nutrition: record.nutrition,
          category: record.category,
          rawNote: record.rawNote,
          extractedNote: record.extractedNote,
          questionId: record.questionId,
          problems: record.problems ?? [],
          status: record.status ?? "pending",
          batchId: record.batchId,
          version: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: get().currentUser,
          updatedBy: get().currentUser,
        };
        set((state) => ({ records: [...state.records, newRecord] }));
        get().addAuditLog({
          recordId: newRecord.id,
          action: "create",
          changes: [{ field: "record", oldValue: null, newValue: newRecord }],
          note: "创建新记录",
        });
        return newRecord;
      },

      updateRecord: (id, updates, note) => {
        set((state) => {
          const record = state.records.find((r) => r.id === id);
          if (!record) return state;
          const changes = Object.entries(updates).map(([field, newValue]) => ({
            field,
            oldValue: record[field as keyof IngredientRecord],
            newValue,
          }));
          if (changes.length > 0) {
            get().addAuditLog({
              recordId: id,
              action: "update",
              changes,
              note,
            });
          }
          const updatedRecord: IngredientRecord = {
            ...record,
            ...updates,
            version: record.version + 1,
            updatedAt: new Date().toISOString(),
            updatedBy: state.currentUser,
            isDirty: true,
          };
          return {
            records: state.records.map((r) => (r.id === id ? updatedRecord : r)),
          };
        });
      },

      updateRecordStatus: (id, status, note) => {
        const record = get().records.find((r) => r.id === id);
        if (!record) return;
        get().addAuditLog({
          recordId: id,
          action: status === "confirmed" ? "confirm" : "reject",
          changes: [{ field: "status", oldValue: record.status, newValue: status }],
          note: note ?? (status === "confirmed" ? "人工确认通过" : "记录被驳回"),
        });
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status,
                  version: r.version + 1,
                  updatedAt: new Date().toISOString(),
                  updatedBy: state.currentUser,
                }
              : r
          ),
        }));
      },

      removeRecordProblems: (id, problemsToRemove) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  problems: r.problems.filter((p) => !problemsToRemove.includes(p)),
                  updatedAt: new Date().toISOString(),
                  updatedBy: state.currentUser,
                }
              : r
          ),
        }));
      },

      addRecordProblem: (id, problem) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id && !r.problems.includes(problem)
              ? {
                  ...r,
                  problems: [...r.problems, problem],
                  updatedAt: new Date().toISOString(),
                  updatedBy: state.currentUser,
                }
              : r
          ),
        }));
      },

      deleteRecord: (id) => {
        get().addAuditLog({
          recordId: id,
          action: "delete",
          changes: [{ field: "record", oldValue: get().records.find((r) => r.id === id), newValue: null }],
          note: "删除记录",
        });
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        }));
      },

      addResult: (result) => {
        const newResult: CalculationResult = {
          ...result,
          id: generateId(),
          calculatedAt: new Date().toISOString(),
          calculatedBy: get().currentUser,
        };
        set((state) => ({ results: [...state.results, newResult] }));
      },

      getResultsByRecordId: (recordId) => {
        return get().results.filter((r) => r.recordId === recordId);
      },

      addAuditLog: (log) => {
        const newLog: AuditLog = {
          ...log,
          id: generateId(),
          timestamp: new Date().toISOString(),
          operator: get().currentUser,
        };
        set((state) => ({ auditLogs: [newLog, ...state.auditLogs] }));
      },

      getAuditLogsByRecordId: (recordId) => {
        return get().auditLogs.filter((l) => l.recordId === recordId);
      },

      addBatch: (batch) => {
        const newBatch: ImportBatch = {
          ...batch,
          id: generateId(),
          importedAt: new Date().toISOString(),
          importedBy: get().currentUser,
        };
        set((state) => ({ batches: [newBatch, ...state.batches] }));
        return newBatch;
      },

      updateBatch: (id, updates) => {
        set((state) => ({
          batches: state.batches.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }));
      },

      getBatchRecords: (batchId) => {
        return get().records.filter((r) => r.batchId === batchId);
      },

      importRecords: (records, batchName, fileName) => {
        const now = new Date().toISOString();
        const state = get();
        const user = state.currentUser;

        const processedRecords: IngredientRecord[] = records.map((r) => ({
          id: generateId(),
          name: r.name ?? "",
          quantity: r.quantity,
          unit: r.unit,
          nutrition: r.nutrition,
          category: r.category,
          rawNote: r.rawNote,
          extractedNote: r.extractedNote,
          questionId: r.questionId,
          problems: r.problems ?? [],
          status: (r.problems?.length ?? 0) > 0 ? "pending" : "confirmed",
          version: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: user,
          updatedBy: user,
        }));

        const conflicts = state.detectConflicts(processedRecords);
        const conflictRecordIds = new Set(conflicts.map((c) => c.recordId));

        const cleanCount = processedRecords.filter((r) => r.problems.length === 0).length;
        const problemCount = processedRecords.length - cleanCount;

        const newBatch: ImportBatch = {
          id: generateId(),
          name: batchName,
          fileName,
          importedAt: now,
          importedBy: user,
          totalRecords: processedRecords.length,
          cleanRecords: cleanCount,
          problemRecords: problemCount,
          status: "processing",
          recordIds: processedRecords
            .filter((r) => !conflictRecordIds.has(r.id))
            .map((r) => r.id),
        };

        const newRecords = processedRecords.filter((r) => !conflictRecordIds.has(r.id));

        set((s) => ({
          records: [...s.records, ...newRecords],
          batches: [newBatch, ...s.batches],
          conflicts: [...s.conflicts, ...conflicts],
        }));

        newRecords.forEach((r) => {
          get().addAuditLog({
            recordId: r.id,
            action: "import",
            changes: [{ field: "record", oldValue: null, newValue: r }],
            note: `从批次 ${batchName} 导入`,
          });
        });

        return { batch: newBatch, conflicts };
      },

      detectConflicts: (newRecords) => {
        const state = get();
        const conflicts: VersionConflict[] = [];

        newRecords.forEach((newRec) => {
          const keyFields: (keyof IngredientRecord)[] = ["questionId", "name"];
          const existing = state.records.find((oldRec) =>
            keyFields.some(
              (f) => newRec[f] && oldRec[f] && String(newRec[f]) === String(oldRec[f])
            )
          );

          if (existing) {
            const diffs: VersionConflict["diffs"] = [];
            const compareFields: (keyof IngredientRecord)[] = [
              "name",
              "quantity",
              "unit",
              "category",
              "nutrition",
              "rawNote",
            ];
            compareFields.forEach((field) => {
              const oldVal = existing[field];
              const newVal = newRec[field];
              const oldStr = JSON.stringify(oldVal);
              const newStr = JSON.stringify(newVal);
              if (oldStr === newStr) {
                diffs.push({ recordId: newRec.id, field, oldValue: oldVal, newValue: newVal, diffType: "unchanged" });
              } else if (oldVal === undefined || oldVal === null || oldVal === "") {
                diffs.push({ recordId: newRec.id, field, oldValue: oldVal, newValue: newVal, diffType: "added" });
              } else if (newVal === undefined || newVal === null || newVal === "") {
                diffs.push({ recordId: newRec.id, field, oldValue: oldVal, newValue: newVal, diffType: "removed" });
              } else {
                diffs.push({ recordId: newRec.id, field, oldValue: oldVal, newValue: newVal, diffType: "changed" });
              }
            });
            conflicts.push({
              recordId: newRec.id,
              oldVersion: existing,
              newVersion: newRec,
              diffs,
            });
          }
        });

        return conflicts;
      },

      resolveConflict: (recordId, resolution, note) => {
        set((state) => {
          const conflict = state.conflicts.find((c) => c.recordId === recordId);
          if (!conflict) return state;

          if (resolution === "keep_new") {
            const newRec = {
              ...conflict.newVersion,
              id: conflict.oldVersion.id,
              version: conflict.oldVersion.version + 1,
              createdAt: conflict.oldVersion.createdAt,
              updatedAt: new Date().toISOString(),
              updatedBy: state.currentUser,
              batchId: conflict.oldVersion.batchId,
            };
            get().addAuditLog({
              recordId: conflict.oldVersion.id,
              action: "update",
              changes: conflict.diffs
                .filter((d) => d.diffType !== "unchanged")
                .map((d) => ({ field: d.field, oldValue: d.oldValue, newValue: d.newValue })),
              note: note ?? "重复导入时选择保留新版本",
            });
            return {
              records: state.records.map((r) => (r.id === conflict.oldVersion.id ? newRec : r)),
              conflicts: state.conflicts.filter((c) => c.recordId !== recordId),
            };
          } else if (resolution === "keep_old") {
            get().addAuditLog({
              recordId: conflict.oldVersion.id,
              action: "update",
              changes: [{ field: "conflict_resolution", oldValue: null, newValue: "keep_old" }],
              note: note ?? "重复导入时选择保留旧版本",
            });
            return {
              conflicts: state.conflicts.filter((c) => c.recordId !== recordId),
            };
          } else {
            return {
              conflicts: state.conflicts.map((c) =>
                c.recordId === recordId
                  ? { ...c, resolution, resolvedBy: state.currentUser, resolvedAt: new Date().toISOString() }
                  : c
              ),
            };
          }
        });
      },

      getRecordsByProblem: (problem) => {
        if (problem === "all") return get().records;
        return get().records.filter((r) => r.problems.includes(problem));
      },

      getRecordsByStatus: (status) => {
        return get().records.filter((r) => r.status === status);
      },

      getProblemStats: () => {
        const stats: Record<ProblemType | "all", number> = {
          all: 0,
          none: 0,
          unit_missing: 0,
          empty_value: 0,
          duplicate: 0,
          note_mixed: 0,
        };
        get().records.forEach((r) => {
          stats.all++;
          if (r.problems.length === 0) stats.none++;
          r.problems.forEach((p) => {
            stats[p]++;
          });
        });
        return stats;
      },

      getBatchStats: (batchId) => {
        const records = get().getBatchRecords(batchId);
        const stats = {
          total: records.length,
          confirmed: 0,
          pending: 0,
          failed: 0,
          problems: {
            unit_missing: 0,
            empty_value: 0,
            duplicate: 0,
            note_mixed: 0,
            none: 0,
          } as Record<ProblemType, number>,
        };
        records.forEach((r) => {
          stats[r.status]++;
          if (r.problems.length === 0) stats.problems.none++;
          r.problems.forEach((p) => {
            stats.problems[p]++;
          });
        });
        return stats;
      },

      resetAll: () => {
        set({
          records: initialRecords,
          results: initialResults,
          auditLogs: initialAuditLogs,
          batches: initialBatches,
          conflicts: initialConflicts,
        });
      },
    }),
    {
      name: "lp-meal-planning-storage-v2",
    }
  )
);
