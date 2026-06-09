import { create } from "zustand";
import type {
  ActionType,
  AnomalyRecord,
  AnomalyType,
  AuditLog,
  BatchData,
  JudgeResult,
  MainTab,
  SampleRecord,
} from "@/types";
import { mockBatches, initialBatchId } from "@/data/mockData";
import { formatTime, judgeComplexation, uid } from "@/utils/chemistry";

interface LabState {
  currentBatchId: string;
  batches: Record<string, BatchData>;
  samples: Record<string, SampleRecord[]>;
  anomalies: Record<string, AnomalyRecord[]>;
  auditLogs: AuditLog[];
  mainTab: MainTab;
  selectedSampleId: string | null;
  showReport: boolean;
  hasRun: boolean;
  rerunCount: number;
  tourStep: number | null;

  setBatch: (id: string) => void;
  setMainTab: (tab: MainTab) => void;
  setSelectedSample: (id: string | null) => void;
  setShowReport: (v: boolean) => void;
  setTourStep: (step: number | null) => void;

  runJudgement: () => void;
  rerunJudgement: () => void;
  supplementField: (
    sampleId: string,
    field: "reactionTime" | "reactionTimeUnit" | "concentrationUnit",
    value: string | number
  ) => void;
  manualConfirm: (sampleId: string, confirmedResult: JudgeResult) => void;
  resolveAnomaly: (sampleId: string) => void;
  addAuditLog: (
    actionType: ActionType,
    detail: string,
    before?: string,
    after?: string,
    sampleId?: string
  ) => void;
}

const buildAnomalies = (samples: SampleRecord[]): AnomalyRecord[] => {
  const result: AnomalyRecord[] = [];
  samples.forEach((s) => {
    if (s.isMissingReactionTime) {
      result.push({
        id: uid(),
        sampleId: s.id,
        sampleNo: s.sampleNo,
        type: "missing_time" as AnomalyType,
        description: s.anomalyReason || "反应时间漏记",
        field: "reactionTime",
        resolved: false,
      });
    }
    if (s.isMissingUnit) {
      result.push({
        id: uid(),
        sampleId: s.id,
        sampleNo: s.sampleNo,
        type: "missing_unit" as AnomalyType,
        description: s.anomalyReason || "浓度单位缺失",
        field: "concentrationUnit",
        resolved: false,
      });
    }
    if (s.anomalyType === "outlier") {
      result.push({
        id: uid(),
        sampleId: s.id,
        sampleNo: s.sampleNo,
        type: "outlier" as AnomalyType,
        description: s.anomalyReason || "离群值",
        field: "peakAbsorbance",
        resolved: false,
      });
    }
    if (s.anomalyType === "manual_flag") {
      result.push({
        id: uid(),
        sampleId: s.id,
        sampleNo: s.sampleNo,
        type: "manual_flag" as AnomalyType,
        description: s.anomalyReason || "需人工确认",
        field: "judgeResult",
        resolved: s.manuallyOverridden || false,
      });
    }
    if (s.anomalyType === "duplicate_batch") {
      result.push({
        id: uid(),
        sampleId: s.id,
        sampleNo: s.sampleNo,
        type: "duplicate_batch" as AnomalyType,
        description: s.anomalyReason || "重复批号数据冲突",
        field: "reactionTimeUnit / concentrationUnit",
        resolved: false,
      });
    }
  });
  return result;
};

const initSamples: Record<string, SampleRecord[]> = {};
const initAnomalies: Record<string, AnomalyRecord[]> = {};
Object.entries(mockBatches).forEach(([id, batch]) => {
  initSamples[id] = batch.samples.map((s) => ({ ...s }));
  initAnomalies[id] = buildAnomalies(batch.samples);
});

export const useLabStore = create<LabState>((set, get) => ({
  currentBatchId: initialBatchId,
  batches: mockBatches,
  samples: initSamples,
  anomalies: initAnomalies,
  auditLogs: [],
  mainTab: "spectrum",
  selectedSampleId: null,
  showReport: false,
  hasRun: false,
  rerunCount: 0,
  tourStep: null,

  setBatch: (id) => {
    set({
      currentBatchId: id,
      selectedSampleId: null,
      hasRun: false,
      rerunCount: 0,
      mainTab: "spectrum",
    });
    get().addAuditLog("run", `切换至批次 ${id}`);
  },
  setMainTab: (tab) => set({ mainTab: tab }),
  setSelectedSample: (id) => set({ selectedSampleId: id }),
  setShowReport: (v) => set({ showReport: v }),
  setTourStep: (step) => set({ tourStep: step }),

  addAuditLog: (actionType, detail, before, after, sampleId) => {
    set((s) => ({
      auditLogs: [
        {
          id: uid(),
          actionType,
          timestamp: formatTime(),
          operator: actionType === "confirm" ? "教师确认" : "系统",
          detail,
          beforeState: before,
          afterState: after,
          targetSampleId: sampleId,
        },
        ...s.auditLogs,
      ],
    }));
  },

  runJudgement: () => {
    const { currentBatchId, samples } = get();
    const updated = samples[currentBatchId].map((s) => ({
      ...s,
      judgeResult: s.judgeResult || judgeComplexation(s),
    }));
    set((s) => ({
      hasRun: true,
      samples: { ...s.samples, [currentBatchId]: updated },
    }));
    get().addAuditLog("run", `对批次 ${currentBatchId} 执行首次判读`);
  },

  rerunJudgement: () => {
    const { currentBatchId, samples, rerunCount } = get();
    const jitter = (v: number, range = 0.02) =>
      Number((v * (1 + (Math.random() - 0.5) * range)).toFixed(4));
    const updated = samples[currentBatchId].map((s) => ({
      ...s,
      peakAbsorbance: s.isAnomaly && s.anomalyType === "outlier"
        ? s.peakAbsorbance
        : jitter(s.peakAbsorbance),
      judgeResult: s.manuallyOverridden ? s.judgeResult : judgeComplexation(s),
    }));
    set((s) => ({
      rerunCount: rerunCount + 1,
      samples: { ...s.samples, [currentBatchId]: updated },
    }));
    get().addAuditLog(
      "rerun",
      `第 ${rerunCount + 1} 次重复运行，吸收值引入 ±1% 随机波动以验证可复现性`
    );
  },

  supplementField: (sampleId, field, value) => {
    const { currentBatchId, samples } = get();
    const target = samples[currentBatchId].find((x) => x.id === sampleId);
    if (!target) return;
    const before =
      field === "reactionTime"
        ? `反应时间: 漏记`
        : field === "concentrationUnit"
          ? `浓度单位: 缺失`
          : `时间单位: 缺失`;
    const after =
      field === "reactionTime"
        ? `反应时间: ${value} ${target.reactionTimeUnit || "min"}`
        : `${field === "concentrationUnit" ? "浓度单位" : "时间单位"}: ${value}`;

    const updated = samples[currentBatchId].map((s) => {
      if (s.id !== sampleId) return s;
      const patch = { [field]: value } as Partial<SampleRecord>;
      if (field === "reactionTime") patch.isMissingReactionTime = false;
      if (field === "concentrationUnit") patch.isMissingUnit = false;
      const merged = { ...s, ...patch };
      if (!merged.manuallyOverridden) {
        merged.judgeResult = judgeComplexation(merged);
      }
      return merged;
    });
    set((s) => ({
      samples: { ...s.samples, [currentBatchId]: updated },
      anomalies: {
        ...s.anomalies,
        [currentBatchId]: s.anomalies[currentBatchId].map((a) =>
          a.sampleId === sampleId &&
          ((field === "reactionTime" && a.type === "missing_time") ||
            (field === "concentrationUnit" && a.type === "missing_unit"))
            ? { ...a, resolved: true, resolvedAt: formatTime(), resolvedBy: "系统(补录)" }
            : a
        ),
      },
    }));
    get().addAuditLog("supplement", `补录样本 ${target.sampleNo} 的${before.includes("反应时间") ? "反应时间" : before.includes("浓度单位") ? "浓度单位" : "时间单位"}`, before, after, sampleId);
  },

  manualConfirm: (sampleId, confirmedResult) => {
    const { currentBatchId, samples } = get();
    const target = samples[currentBatchId].find((x) => x.id === sampleId);
    if (!target) return;
    const before = `${target.sampleNo} 判断: ${target.judgeResult}（${target.anomalyReason || "异常标记"}）`;
    const after = `${target.sampleNo} 判断: ${confirmedResult}（人工确认）`;
    const updated = samples[currentBatchId].map((s) =>
      s.id === sampleId
        ? {
            ...s,
            judgeResult: confirmedResult,
            manuallyOverridden: true,
            originalJudgeResult: s.originalJudgeResult || s.judgeResult,
            isAnomaly: false,
          }
        : s
    );
    set((s) => ({
      samples: { ...s.samples, [currentBatchId]: updated },
      anomalies: {
        ...s.anomalies,
        [currentBatchId]: s.anomalies[currentBatchId].map((a) =>
          a.sampleId === sampleId
            ? { ...a, resolved: true, resolvedAt: formatTime(), resolvedBy: "教师" }
            : a
        ),
      },
    }));
    get().addAuditLog("confirm", `人工确认样本 ${target.sampleNo} 判断结果为「${confirmedResult}」`, before, after, sampleId);
  },

  resolveAnomaly: (sampleId) => {
    const { currentBatchId } = get();
    set((s) => ({
      anomalies: {
        ...s.anomalies,
        [currentBatchId]: s.anomalies[currentBatchId].map((a) =>
          a.sampleId === sampleId
            ? { ...a, resolved: true, resolvedAt: formatTime(), resolvedBy: "教师" }
            : a
        ),
      },
    }));
  },
}));
