import { create } from "zustand";
import type {
  AppStore,
  SequenceProblem,
  OperationLog,
  ProblemStatus,
} from "@/types";
import { mockProblems, mockLogs } from "@/data/mockData";
import { arraysEqual, generateDedupKey } from "@/utils/sequence";

const STORAGE_KEY = "sequence-counterexample-lib-v1";
const LOGS_KEY = "sequence-counterexample-logs-v1";
const FIRST_VISIT_KEY = "sequence-counterexample-first-visit";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

function initData(): { problems: SequenceProblem[]; logs: OperationLog[] } {
  const firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
  if (!firstVisit) {
    localStorage.setItem(FIRST_VISIT_KEY, "done");
    saveToStorage(STORAGE_KEY, mockProblems);
    saveToStorage(LOGS_KEY, mockLogs);
    return { problems: mockProblems, logs: mockLogs };
  }
  const problems = loadFromStorage<SequenceProblem[]>(STORAGE_KEY, mockProblems);
  const logs = loadFromStorage<OperationLog[]>(LOGS_KEY, mockLogs);
  return { problems, logs };
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const useStore = create<AppStore>((set, get) => {
  const initial = initData();
  return {
    problems: initial.problems,
    logs: initial.logs,
    selectedProblemId: initial.problems[0]?.id ?? null,
    filters: { onlyOutliers: false },

    selectProblem: (id) => set({ selectedProblemId: id }),

    setFilters: (filters) =>
      set((state) => ({ filters: { ...state.filters, ...filters } })),

    correctProblem: (id, correctedValues, reason, operator) => {
      const state = get();
      const problem = state.problems.find((p) => p.id === id);
      if (!problem) return;
      const before = JSON.stringify(problem.correctedValues ?? problem.computedValues);
      const after = JSON.stringify(correctedValues);
      const log: OperationLog = {
        id: uid("LOG"),
        problemId: id,
        operationType: "correct",
        operator,
        beforeValue: before,
        afterValue: after,
        reason,
        timestamp: new Date().toISOString(),
      };
      const updatedProblem: SequenceProblem = {
        ...problem,
        correctedValues,
        status: "approved",
        dataGrade: "available",
        updatedAt: new Date().toISOString(),
      };
      const statusLog: OperationLog = {
        id: uid("LOG"),
        problemId: id,
        operationType: "status_change",
        operator,
        beforeValue: problem.status,
        afterValue: "approved",
        reason: "人工修正后确认通过",
        timestamp: new Date().toISOString(),
      };
      const newProblems = state.problems.map((p) => (p.id === id ? updatedProblem : p));
      const newLogs = [log, statusLog, ...state.logs];
      saveToStorage(STORAGE_KEY, newProblems);
      saveToStorage(LOGS_KEY, newLogs);
      set({ problems: newProblems, logs: newLogs });
    },

    updateStatus: (id, status, operator, reason) => {
      const state = get();
      const problem = state.problems.find((p) => p.id === id);
      if (!problem) return;
      const log: OperationLog = {
        id: uid("LOG"),
        problemId: id,
        operationType: "status_change",
        operator,
        beforeValue: problem.status,
        afterValue: status,
        reason,
        timestamp: new Date().toISOString(),
      };
      const gradeMap: Record<ProblemStatus, "available" | "pending" | "recollect"> = {
        approved: "available",
        pending: "pending",
        suspended: "pending",
        recollect: "recollect",
      };
      const updatedProblem: SequenceProblem = {
        ...problem,
        status,
        dataGrade: gradeMap[status],
        updatedAt: new Date().toISOString(),
      };
      const newProblems = state.problems.map((p) => (p.id === id ? updatedProblem : p));
      const newLogs = [log, ...state.logs];
      saveToStorage(STORAGE_KEY, newProblems);
      saveToStorage(LOGS_KEY, newLogs);
      set({ problems: newProblems, logs: newLogs });
    },

    importProblems: (incoming, operator) => {
      const state = get();
      const existingKeys = new Map(
        state.problems.map((p) => [generateDedupKey(p.id, p.recurrenceFormula), p])
      );
      let added = 0;
      let updated = 0;
      let skipped = 0;
      let conflicts = 0;
      const merged: SequenceProblem[] = [...state.problems];
      const importLogs: OperationLog[] = [];
      for (const inc of incoming) {
        const key = generateDedupKey(inc.id, inc.recurrenceFormula);
        const existing = existingKeys.get(key);
        if (!existing) {
          merged.push({ ...inc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
          added++;
          importLogs.push({
            id: uid("LOG"),
            problemId: inc.id,
            operationType: "import",
            operator,
            beforeValue: "(无)",
            afterValue: `${inc.id} 新增入库`,
            timestamp: new Date().toISOString(),
          });
        } else if (arraysEqual(existing.computedValues, inc.computedValues)) {
          skipped++;
        } else {
          conflicts++;
          const idx = merged.findIndex((p) => p.id === existing.id);
          if (idx >= 0) {
            merged[idx] = {
              ...inc,
              id: existing.id,
              correctedValues: existing.correctedValues,
              status: existing.status,
              dataGrade: existing.dataGrade,
              createdAt: existing.createdAt,
              updatedAt: new Date().toISOString(),
            };
          }
          updated++;
          importLogs.push({
            id: uid("LOG"),
            problemId: inc.id,
            operationType: "merge",
            operator,
            beforeValue: JSON.stringify(existing.computedValues),
            afterValue: JSON.stringify(inc.computedValues),
            reason: "导入补录，合并计算值",
            timestamp: new Date().toISOString(),
          });
        }
      }
      const newLogs = [...importLogs, ...state.logs];
      saveToStorage(STORAGE_KEY, merged);
      saveToStorage(LOGS_KEY, newLogs);
      set({ problems: merged, logs: newLogs });
      return { added, updated, skipped, conflicts };
    },

    getFilteredProblems: () => {
      const { problems, filters } = get();
      let list = problems;
      if (filters.status) {
        list = list.filter((p) => p.status === filters.status);
      }
      if (filters.onlyOutliers) {
        list = list.filter((p) => p.isExtrapolationOutlier);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (p) =>
            p.id.toLowerCase().includes(q) ||
            p.title.toLowerCase().includes(q) ||
            p.recurrenceFormula.toLowerCase().includes(q)
        );
      }
      return list;
    },

    getStats: () => {
      const { problems } = get();
      return {
        total: problems.length,
        available: problems.filter((p) => p.dataGrade === "available").length,
        pending: problems.filter((p) => p.dataGrade === "pending").length,
        recollect: problems.filter((p) => p.dataGrade === "recollect").length,
        outliers: problems.filter((p) => p.isExtrapolationOutlier).length,
      };
    },

    getLogsByProblem: (problemId) => {
      return get()
        .logs.filter((l) => l.problemId === problemId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
  };
});
