import { create } from "zustand";
import { seedAnnotations, seedHistory } from "@/utils/mockData";
import type { Annotation, HistoryLog, HistoryAction } from "@/shared/types";
import { loadStorage, saveStorage } from "@/utils/storage";
import { detectMixedUnit } from "@/hooks/useMixedUnitDetection";

interface AnnotationState {
  annotations: Annotation[];
  historyLogs: HistoryLog[];
  addAnnotation: (input: {
    objectId: string;
    timestamp: number;
    content: string;
    author: string;
  }) => Annotation;
  revokeLast: (operator: string) => Annotation | null;
  addHistory: (
    action: HistoryAction,
    targetId: string,
    operator: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>
  ) => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: loadStorage("annotations", seedAnnotations),
  historyLogs: loadStorage("history", seedHistory),
  addAnnotation: ({ objectId, timestamp, content, author }) => {
    const mixed = detectMixedUnit(content);
    const ann: Annotation = {
      id: `ann-${Date.now()}`,
      objectId,
      timestamp,
      content,
      author,
      status: "ACTIVE",
      mixedWarning: mixed.hasMixed,
      createdAt: Date.now(),
    };
    const next = [ann, ...get().annotations];
    set({ annotations: next });
    saveStorage("annotations", next);
    get().addHistory("ANNOTATE", ann.id, author, undefined, {
      status: "ACTIVE",
      mixedWarning: mixed.hasMixed,
    });
    return ann;
  },
  revokeLast: (operator) => {
    const active = get().annotations.filter((a) => a.status === "ACTIVE");
    if (active.length === 0) return null;
    const last = active[0];
    const next = get().annotations.map((a) =>
      a.id === last.id ? { ...a, status: "REVOKED" as const } : a
    );
    set({ annotations: next });
    saveStorage("annotations", next);
    get().addHistory(
      "REVOKE",
      last.id,
      operator,
      { status: "ACTIVE" },
      { status: "REVOKED" }
    );
    return { ...last, status: "REVOKED" };
  },
  addHistory: (action, targetId, operator, before, after) => {
    const log: HistoryLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      targetId,
      before,
      after,
      operator,
      createdAt: Date.now(),
    };
    const next = [log, ...get().historyLogs];
    set({ historyLogs: next });
    saveStorage("history", next);
  },
}));
