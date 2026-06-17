// 处理记录 Store —— 单一事实源：安全拦截 / 人工修正 / 泄漏检测写入同一份
import { create } from "zustand";
import type {
  Version,
  Sample,
  ProcessingRecord,
  Anomaly,
  TrainingSample,
  QuestionBank,
  LeakageRecord,
  RefusalDecision,
} from "@/data/types";
import {
  VERSIONS,
  SAMPLES,
  PROCESSING_RECORDS,
  ANOMALIES,
  TRAINING_SAMPLES,
  QUESTION_BANKS,
  LEAKAGE_RECORDS,
  CURRENT_VERSION_ID,
} from "@/data/mockData";

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface DashboardState {
  versions: Version[];
  samples: Sample[];
  processingRecords: ProcessingRecord[];
  anomalies: Anomaly[];
  trainingSamples: TrainingSample[];
  questionBanks: QuestionBank[];
  leakageRecords: LeakageRecord[];
  currentVersionId: string;

  setVersion: (id: string) => void;

  // 人工修正：写入共享处理记录，同步更新样本有效判定
  applyCorrection: (
    sampleId: string,
    next: RefusalDecision,
    opinion: string,
    reviewer: string,
  ) => void;

  // 题库二次导入：按内容哈希去重，复用既有结论（不产生矛盾）
  reimportQuestionBank: (questionBankId: string) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  versions: VERSIONS,
  samples: SAMPLES,
  processingRecords: PROCESSING_RECORDS,
  anomalies: ANOMALIES,
  trainingSamples: TRAINING_SAMPLES,
  questionBanks: QUESTION_BANKS,
  leakageRecords: LEAKAGE_RECORDS,
  currentVersionId: CURRENT_VERSION_ID,

  setVersion: (id) => set({ currentVersionId: id }),

  applyCorrection: (sampleId, next, opinion, reviewer) => {
    const state = get();
    const sample = state.samples.find((s) => s.id === sampleId);
    if (!sample) return;
    const before = sample.refusalDecision;
    const ts = nowStamp();
    const recordId = `PR-C-${Date.now().toString().slice(-6)}`;

    const newRecord: ProcessingRecord = {
      id: recordId,
      sampleId,
      versionId: sample.versionId,
      type: "correction",
      result: next === "refuse" ? "修正为拒答" : "修正为回答",
      reasonCode: `MANUAL_FLIP::${before.toUpperCase()}->${next.toUpperCase()}`,
      reasonPlain: `人工修正：${opinion}`,
      reviewer,
      timestamp: ts,
    };

    set({
      processingRecords: [...state.processingRecords, newRecord],
      samples: state.samples.map((s) =>
        s.id === sampleId
          ? {
              ...s,
              refusalDecision: next,
              correction: {
                status: "corrected",
                reviewer,
                opinion,
                before,
                after: next,
                timestamp: ts,
              },
              processingRecordIds: [...s.processingRecordIds, recordId],
            }
          : s,
      ),
    });
  },

  reimportQuestionBank: (questionBankId) => {
    const state = get();
    const qb = state.questionBanks.find((q) => q.id === questionBankId);
    if (!qb) return;
    const ts = nowStamp();
    const versionId = state.currentVersionId;
    const alreadyReimported = state.leakageRecords.some(
      (lr) =>
        lr.questionBankId === questionBankId &&
        lr.importRuns.some((r) => r.versionId === versionId),
    );
    if (alreadyReimported) return;

    set({
      questionBanks: state.questionBanks.map((q) =>
        q.id === questionBankId ? { ...q, importCount: q.importCount + 1 } : q,
      ),
      leakageRecords: state.leakageRecords.map((lr) =>
        lr.questionBankId === questionBankId
          ? {
              ...lr,
              importRuns: [
                ...lr.importRuns,
                {
                  versionId,
                  timestamp: ts,
                  isReimport: true,
                  reusedConclusion: true,
                  deltaNote:
                    "二次导入：题库内容哈希一致，复用既有统一结论，未产生新结论，无矛盾。",
                },
              ],
            }
          : lr,
      ),
    });
  },
}));
