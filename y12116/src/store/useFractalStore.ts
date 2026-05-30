import { create } from "zustand";
import type {
  IterationRule,
  InitialShape,
  ValidationResult,
  AuditEntry,
  ConflictEntry,
  DimensionInfo,
} from "@/types";
import { generateFractalPoints, computeBounds, estimatePrimitiveCount, type Point } from "@/engine/fractal";
import { calculateDimension } from "@/engine/dimension";
import { runAllValidations } from "@/engine/validator";
import { getDefaultRule, getDefaultShape } from "@/data/samples";

const uid = () => crypto.randomUUID();

interface FractalStore {
  activeRule: IterationRule;
  activeShape: InitialShape;
  iterationCount: number;
  points: Point[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  dimensionInfo: DimensionInfo;
  validations: ValidationResult[];
  auditLog: AuditEntry[];
  conflicts: ConflictEntry[];
  isGenerating: boolean;
  showConflictPanel: boolean;
  showAuditPanel: boolean;

  setRule: (rule: IterationRule) => void;
  updateRuleField: (field: string, value: unknown) => void;
  setShape: (shape: InitialShape) => void;
  updateShapeField: (field: string, value: unknown) => void;
  setIterationCount: (n: number) => void;
  generate: () => void;
  validate: () => void;
  resolveConflict: (field: string, choice: "rule" | "shape") => void;
  addAuditEntry: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;
  setConflicts: (conflicts: ConflictEntry[]) => void;
  setShowConflictPanel: (show: boolean) => void;
  setShowAuditPanel: (show: boolean) => void;
  getPrimitiveCount: () => number;
  resetToDefault: () => void;
}

export const useFractalStore = create<FractalStore>((set, get) => ({
  activeRule: getDefaultRule(),
  activeShape: getDefaultShape(),
  iterationCount: 5,
  points: [],
  bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  dimensionInfo: { hausdorff: 0, boxCount: 0, method: "" },
  validations: [],
  auditLog: [],
  conflicts: [],
  isGenerating: false,
  showConflictPanel: false,
  showAuditPanel: false,

  setRule: (rule) => {
    set({ activeRule: rule });
    get().validate();
  },

  updateRuleField: (field, value) => {
    const oldRule = get().activeRule;
    const oldVal = (oldRule as unknown as Record<string, unknown>)[field];
    set({ activeRule: { ...oldRule, [field]: value, updatedAt: Date.now() } });
    get().addAuditEntry({
      targetRecordId: oldRule.id,
      targetFieldName: `iterationRule.${field}`,
      oldValue: oldVal,
      newValue: value,
      operator: "当前用户",
      reason: "手动修改",
    });
    get().validate();
  },

  setShape: (shape) => {
    set({ activeShape: shape });
    get().validate();
  },

  updateShapeField: (field, value) => {
    const oldShape = get().activeShape;
    const oldVal = (oldShape as unknown as Record<string, unknown>)[field];
    set({ activeShape: { ...oldShape, [field]: value, updatedAt: Date.now() } });
    get().addAuditEntry({
      targetRecordId: oldShape.id,
      targetFieldName: `initialShape.${field}`,
      oldValue: oldVal,
      newValue: value,
      operator: "当前用户",
      reason: "手动修改",
    });
    get().validate();
  },

  setIterationCount: (n) => {
    const old = get().iterationCount;
    set({ iterationCount: n });
    get().addAuditEntry({
      targetRecordId: "config",
      targetFieldName: "iterationCount",
      oldValue: old,
      newValue: n,
      operator: "当前用户",
      reason: "手动修改",
    });
  },

  generate: () => {
    set({ isGenerating: true });
    const { activeRule, activeShape, iterationCount } = get();
    const pts = generateFractalPoints(activeRule, activeShape, iterationCount);
    const bds = computeBounds(pts);
    const dim = calculateDimension(activeRule);
    set({ points: pts, bounds: bds, dimensionInfo: dim, isGenerating: false });
    get().validate();
  },

  validate: () => {
    const { activeRule, activeShape } = get();
    const results = runAllValidations(activeRule, activeShape);
    set({ validations: results });
  },

  resolveConflict: (field, choice) => {
    const conflicts = get().conflicts.map((c) =>
      c.field === field ? { ...c, resolved: true, resolution: choice } : c
    );
    set({ conflicts });

    const resolved = conflicts.find((c) => c.field === field);
    if (resolved) {
      get().addAuditEntry({
        targetRecordId: "conflict",
        targetFieldName: field,
        oldValue: choice === "rule" ? resolved.shapeValue : resolved.ruleValue,
        newValue: choice === "rule" ? resolved.ruleValue : resolved.shapeValue,
        operator: "当前用户",
        reason: `冲突解决：选择${choice === "rule" ? "迭代规则" : "初始图形"}的值`,
      });
    }

    if (conflicts.every((c) => c.resolved)) {
      set({ showConflictPanel: false });
    }
  },

  addAuditEntry: (entry) => {
    const newEntry: AuditEntry = {
      ...entry,
      id: uid(),
      timestamp: Date.now(),
    };
    set((s) => ({ auditLog: [newEntry, ...s.auditLog] }));
    try {
      const stored = JSON.parse(localStorage.getItem("fractal_audit_log") || "[]");
      stored.unshift(newEntry);
      localStorage.setItem("fractal_audit_log", JSON.stringify(stored.slice(0, 500)));
    } catch { /* ignore */ }
  },

  setConflicts: (conflicts) => set({ conflicts, showConflictPanel: conflicts.length > 0 }),
  setShowConflictPanel: (show) => set({ showConflictPanel: show }),
  setShowAuditPanel: (show) => set({ showAuditPanel: show }),

  getPrimitiveCount: () => {
    const { activeRule, activeShape } = get();
    return estimatePrimitiveCount(activeRule, activeShape);
  },

  resetToDefault: () => {
    set({
      activeRule: getDefaultRule(),
      activeShape: getDefaultShape(),
      iterationCount: 5,
      points: [],
      validations: [],
      conflicts: [],
      showConflictPanel: false,
    });
  },
}));
