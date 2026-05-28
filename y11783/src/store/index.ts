import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type {
  PartitionConfig,
  PartitionResult,
  PartitionWarning,
  RecursionStep,
  Session,
  CorrectionRecord,
  ImportMeta,
  MaterialImport,
  RemovedPartition,
} from "@/types";
import { DEFAULT_CONFIG } from "@/types";
import { generatePartitions } from "@/utils/partition";
import * as db from "@/utils/db";

interface PartitionStore {
  config: PartitionConfig;
  currentResult: PartitionResult | null;
  currentSession: Session | null;
  sessions: Session[];
  warnings: PartitionWarning[];
  recursionSteps: RecursionStep[];
  isGenerating: boolean;
  stepIndex: number;
  isPlaying: boolean;
  showRemoved: boolean;
  explosionAcknowledged: boolean;
  importDialogOpen: boolean;

  setConfig: (config: Partial<PartitionConfig>) => void;
  generate: () => void;
  acknowledgeExplosion: () => void;
  setStepIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  toggleShowRemoved: () => void;
  setImportDialogOpen: (open: boolean) => void;
  importMaterial: (material: MaterialImport, strategy: "ignore" | "overwrite" | "append") => void;
  loadSessions: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  restoreSession: (session: Session) => void;
  addCorrection: (field: string, oldValue: unknown, newValue: unknown, reason: string) => void;
  resetConfig: () => void;
}

export const usePartitionStore = create<PartitionStore>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  currentResult: null,
  currentSession: null,
  sessions: [],
  warnings: [],
  recursionSteps: [],
  isGenerating: false,
  stepIndex: -1,
  isPlaying: false,
  showRemoved: false,
  explosionAcknowledged: false,
  importDialogOpen: false,

  setConfig: (partial) => {
    const oldConfig = get().config;
    const newConfig = { ...oldConfig, ...partial };
    set({ config: newConfig });

    if (get().currentSession) {
      for (const key of Object.keys(partial)) {
        get().addCorrection(
          `config.${key}`,
          (oldConfig as unknown as Record<string, unknown>)[key],
          (partial as unknown as Record<string, unknown>)[key],
          "用户修改参数"
        );
      }
    }
  },

  generate: () => {
    set({ isGenerating: true, explosionAcknowledged: false });
    const config = get().config;

    const result = generatePartitions(config);

    const partitionResult: PartitionResult = {
      id: uuid(),
      config: { ...config },
      allPartitions: result.allPartitions,
      filteredPartitions: result.filteredPartitions,
      removedPartitions: result.removedPartitions,
      warnings: result.warnings,
      recursionSteps: result.recursionSteps,
      timestamp: Date.now(),
      source: "manual",
    };

    let session = get().currentSession;
    if (!session) {
      session = {
        id: uuid(),
        results: [],
        corrections: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    session.results.push(partitionResult);
    session.updatedAt = Date.now();

    db.saveSession(session);
    db.saveResult(partitionResult);

    set({
      currentResult: partitionResult,
      currentSession: session,
      warnings: result.warnings,
      recursionSteps: result.recursionSteps,
      isGenerating: false,
      stepIndex: -1,
      isPlaying: false,
    });

    get().loadSessions();
  },

  acknowledgeExplosion: () => set({ explosionAcknowledged: true }),

  setStepIndex: (index) => set({ stepIndex: index }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  toggleShowRemoved: () => set((s) => ({ showRemoved: !s.showRemoved })),

  setImportDialogOpen: (open) => set({ importDialogOpen: open }),

  importMaterial: (material, strategy) => {
    const config = get().config;

    if (strategy === "ignore" && get().currentResult) {
      return;
    }

    let newConfig = { ...config };
    const fieldsImported: string[] = [];

    if (material.targetNumber !== undefined) {
      if (strategy === "overwrite" || !get().currentResult) {
        newConfig.targetNumber = material.targetNumber;
        fieldsImported.push("targetNumber");
      } else if (strategy === "append") {
        newConfig.targetNumber = material.targetNumber;
        fieldsImported.push("targetNumber");
      }
    }

    if (material.constraints) {
      for (const [key, value] of Object.entries(material.constraints)) {
        if (value !== undefined) {
          (newConfig as Record<string, unknown>)[key] = value;
          fieldsImported.push(key);
        }
      }
    }

    const importMeta: ImportMeta = {
      filename: "导入材料",
      importTime: Date.now(),
      strategy,
      fieldsImported,
    };

    set({ config: newConfig });

    if (get().currentSession) {
      get().addCorrection("config", config, newConfig, `导入材料（策略：${strategy}）`);
    }

    const result = generatePartitions(newConfig);
    const partitionResult: PartitionResult = {
      id: uuid(),
      config: { ...newConfig },
      allPartitions: result.allPartitions,
      filteredPartitions: result.filteredPartitions,
      removedPartitions: result.removedPartitions,
      warnings: result.warnings,
      recursionSteps: result.recursionSteps,
      timestamp: Date.now(),
      source: "import",
      importMeta,
    };

    let session = get().currentSession;
    if (!session) {
      session = {
        id: uuid(),
        results: [],
        corrections: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    session.results.push(partitionResult);
    session.updatedAt = Date.now();

    db.saveSession(session);
    db.saveResult(partitionResult);

    set({
      currentResult: partitionResult,
      currentSession: session,
      warnings: result.warnings,
      recursionSteps: result.recursionSteps,
    });

    get().loadSessions();
  },

  loadSessions: async () => {
    const sessions = await db.loadAllSessions();
    set({ sessions });
  },

  deleteSession: async (id) => {
    await db.deleteSession(id);
    await get().loadSessions();
  },

  restoreSession: (session) => {
    const lastResult = session.results[session.results.length - 1];
    set({
      currentSession: session,
      currentResult: lastResult || null,
      config: lastResult ? { ...lastResult.config } : { ...DEFAULT_CONFIG },
      warnings: lastResult?.warnings || [],
      recursionSteps: lastResult?.recursionSteps || [],
    });
  },

  addCorrection: (field, oldValue, newValue, reason) => {
    const session = get().currentSession;
    if (!session) return;

    const correction: CorrectionRecord = {
      id: uuid(),
      sessionId: session.id,
      timestamp: Date.now(),
      field,
      oldValue,
      newValue,
      reason,
    };

    session.corrections.push(correction);
    session.updatedAt = Date.now();

    db.saveCorrection(correction);
    db.saveSession(session);

    set({ currentSession: { ...session } });
  },

  resetConfig: () => set({ config: { ...DEFAULT_CONFIG } }),
}));
