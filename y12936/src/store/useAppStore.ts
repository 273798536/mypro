import { create } from "zustand";
import {
  samples as seedSamples,
  leaks as seedLeaks,
  replayRecords as seedReplays,
  promptVersions as seedVersions,
} from "@/mock/data";
import type {
  PromptVersion,
  RemediationKind,
  ReplayRecord,
  Sample,
  ValidationLeak,
} from "@/types";

function nowStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface AppState {
  samples: Sample[];
  leaks: ValidationLeak[];
  replayRecords: ReplayRecord[];
  promptVersions: PromptVersion[];
  selectedSampleId: string;
  workbenchTab: "metrics" | "leak";
  exportVersion: number;
  lastExportedAt: string | null;
  justExported: boolean;

  selectSample: (id: string) => void;
  setWorkbenchTab: (tab: "metrics" | "leak") => void;
  completeRemediation: (leakId: string, kind: RemediationKind) => void;
  exportReport: () => string[];
}

const useAppStore = create<AppState>((set, get) => ({
  samples: seedSamples,
  leaks: seedLeaks,
  replayRecords: seedReplays,
  promptVersions: seedVersions,
  selectedSampleId: seedSamples[0].id,
  workbenchTab: "metrics",
  exportVersion: 0,
  lastExportedAt: null,
  justExported: false,

  selectSample: (id) => set({ selectedSampleId: id }),
  setWorkbenchTab: (tab) => set({ workbenchTab: tab }),

  completeRemediation: (leakId, kind) =>
    set((state) => ({
      leaks: state.leaks.map((lk) =>
        lk.id !== leakId
          ? lk
          : {
              ...lk,
              [kind]: {
                tried: true,
                result: defaultRemediationResult(kind),
                time: nowStr(),
              },
            },
      ),
    })),

  exportReport: () => {
    const state = get();
    const version = state.exportVersion + 1;
    const stamp = nowStr();

    const dirtyTargets = state.samples.filter(
      (s) => s.status === "dirty" || s.status === "fixed",
    );
    const newRecords: ReplayRecord[] = dirtyTargets.map((s) => ({
      id: `RP-${version}-${s.id}`,
      sampleId: s.id,
      sampleLabel: `${s.group} · ${s.id}`,
      trigger: `报告导出 #${version}（应用「补录备注优先 + 单位校验」策略）`,
      time: stamp,
      changed: true,
      beforeJudgment: exportBeforeJudgment(s),
      afterJudgment: exportAfterJudgment(s),
    }));

    set({
      exportVersion: version,
      lastExportedAt: stamp,
      justExported: true,
      replayRecords: [...newRecords, ...state.replayRecords],
    });
    return newRecords.map((r) => r.id);
  },
}));

function defaultRemediationResult(kind: RemediationKind): string {
  switch (kind) {
    case "rerun":
      return "已用去重后配置重跑，结果已记录。";
    case "supplementary":
      return "已补录至泄漏清单并替换为同分布样本。";
    case "manualConfirm":
      return "工程师已人工复核并确认结论。";
  }
}

function exportBeforeJudgment(s: Sample): string {
  return `判断：对齐良好。${s.question.slice(0, 8)}… 取值 ${s.offlinePred}，离线与在线一致，归入干净样本。`;
}

function exportAfterJudgment(s: Sample): string {
  const issue =
    s.status === "fixed"
      ? `补录修正后为「${s.correction?.to ?? s.groundTruth}」`
      : `标准应为「${s.groundTruth}」`;
  return `判断：数据不一致。取值 ${s.offlinePred} 与材料冲突，${issue}，改判为${s.status === "fixed" ? "已修正" : "脏数据"}。`;
}

export { useAppStore };

export function leakIsComplete(lk: ValidationLeak): boolean {
  return lk.rerun.tried && lk.supplementary.tried && lk.manualConfirm.tried;
}

export function leakProgress(lk: ValidationLeak): { done: number; total: number } {
  const done = [lk.rerun.tried, lk.supplementary.tried, lk.manualConfirm.tried].filter(
    Boolean,
  ).length;
  return { done, total: 3 };
}
