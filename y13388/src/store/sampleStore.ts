import { create } from "zustand";
import type { ConclusionKey } from "@/utils/constants";
import type { Correction, GrayBreakdown, Sample } from "@/utils/types";
import { SAMPLES } from "@/mock/samples";
import { VERSIONS } from "@/mock/versions";
import { GRAY_CONFIGS } from "@/mock/grayscales";

interface SampleState {
  allSamples: Sample[];
  versions: typeof VERSIONS;
  grayConfigs: typeof GRAY_CONFIGS;
  activeEventFilters: string[];
  setActiveEventFilters: (f: string[]) => void;
  findSampleById: (id: string) => Sample | undefined;
  computeGrayBreakdown: (sample: Sample) => GrayBreakdown;
  addCorrection: (sampleId: string, params: { oldConclusion: ConclusionKey; newConclusion: ConclusionKey; reason: string; operator: string }) => Sample | undefined;
  togglePollution: (sampleId: string, status: "CLEAN" | "SUSPICIOUS" | "CONFIRMED", note?: string) => Sample | undefined;
}

export const useSampleStore = create<SampleState>((set, get) => ({
  allSamples: SAMPLES,
  versions: VERSIONS,
  grayConfigs: GRAY_CONFIGS,
  activeEventFilters: [],
  setActiveEventFilters: (f) => set({ activeEventFilters: f }),
  findSampleById: (id) => get().allSamples.find((s) => s.id === id),
  computeGrayBreakdown: (sample) => {
    const versions = get().versions;
    const idx = versions.findIndex((v) => v.id === sample.versionId);
    const curVer = versions[idx];
    const prevVer = versions[Math.max(0, idx - 1)];
    const latestScore = sample.algoScores[sample.algoScores.length - 1];
    const prevScore = sample.algoScores[sample.algoScores.length - 2];
    const raw = latestScore?.rawScore ?? latestScore?.score ?? 0;
    const smoothed = latestScore?.smoothedScore ?? latestScore?.score ?? 0;
    const scoreChange = prevScore ? latestScore.score - prevScore.score : 0;
    const thresholdChange = curVer && prevVer ? prevVer.threshold - curVer.threshold : 0;
    const smoothedGap = Math.max(0, raw - smoothed);
    const total = Math.abs(scoreChange) + Math.abs(thresholdChange) + smoothedGap + 0.0001;
    return [
      {
        key: "sample",
        label: "样本变化",
        contribution: Math.abs(scoreChange) / total,
        description: scoreChange >= 0
          ? `样本本身评分上升 ${scoreChange.toFixed(3)}`
          : `样本本身评分下降 ${Math.abs(scoreChange).toFixed(3)}`,
        details: [
          { label: "上一版本评分", value: prevScore?.score.toFixed(3) ?? "—" },
          { label: "当前版本评分", value: latestScore.score.toFixed(3) },
          { label: "变化幅度", value: (scoreChange >= 0 ? "+" : "") + scoreChange.toFixed(3) },
          { label: "特征维度数", value: sample.featureVector.length },
        ],
        miniChart: sample.algoScores.map((a) => a.score),
      },
      {
        key: "threshold",
        label: "阈值变化",
        contribution: Math.abs(thresholdChange) / total,
        description: thresholdChange > 0
          ? `阈值放宽 ${thresholdChange.toFixed(3)}，该样本相对更容易通过`
          : thresholdChange < 0
            ? `阈值收紧 ${Math.abs(thresholdChange).toFixed(3)}，该样本相对更难通过`
            : "版本阈值未变化",
        details: [
          { label: "上一版本阈值", value: prevVer?.threshold.toFixed(3) ?? "—" },
          { label: "当前版本阈值", value: curVer?.threshold.toFixed(3) ?? "—" },
          {
            label: "灰度策略窗口",
            value: `${get().grayConfigs.find((g) => g.id === sample.grayConfigId)?.windowSize ?? "?"}天`,
          },
          {
            label: "灰度比例",
            value: `${((get().grayConfigs.find((g) => g.id === sample.grayConfigId)?.ratio ?? 0) * 100).toFixed(0)}%`,
          },
        ],
        miniChart: versions.slice(0, idx + 1).map((v) => v.threshold),
      },
      {
        key: "manual",
        label: "人工改判",
        contribution: (smoothedGap + (sample.correctionHistory.length ? 0.02 : 0)) / total,
        description: sample.correctionHistory.length
          ? `已人工改判 ${sample.correctionHistory.length} 次，最后一次：${sample.correctionHistory[0].reason.slice(0, 24)}...`
          : smoothedGap > 0.01
            ? `原始分 ${raw.toFixed(3)} 高于平滑分 ${smoothed.toFixed(3)}，可能被平均数盖住`
            : "暂无人工干预，评分与阈值分布匹配",
        details: [
          { label: "原始算法分", value: raw.toFixed(3), note: sample.coveredByMean ? "被窗口平滑掩盖" : undefined },
          { label: "平滑后得分", value: smoothed.toFixed(3) },
          { label: "差值(被覆盖幅度)", value: smoothedGap.toFixed(3), note: smoothedGap > 0.02 ? "显著：注意被均值盖住" : undefined },
          { label: "人工修正次数", value: sample.correctionHistory.length.toString() },
        ],
        miniChart: [
          raw,
          smoothed,
          curVer?.threshold ?? 0,
          Math.max(...sample.algoScores.map((a) => a.score)),
        ],
      },
    ];
  },
  addCorrection: (sampleId, { oldConclusion, newConclusion, reason, operator }) => {
    let updated: Sample | undefined;
    set((s) => {
      const next = s.allSamples.map((sample) => {
        if (sample.id !== sampleId) return sample;
        const corr: Correction = {
          id: `corr-auto-${Date.now()}`,
          sampleId,
          operator,
          timestamp: new Date().toISOString(),
          oldConclusion,
          newConclusion,
          reason,
        };
        updated = {
          ...sample,
          conclusion: newConclusion,
          correctionHistory: [corr, ...sample.correctionHistory],
          conclusionReason: reason,
        };
        return updated;
      });
      return { allSamples: next };
    });
    return updated;
  },
  togglePollution: (sampleId, status, note) => {
    let updated: Sample | undefined;
    set((s) => ({
      allSamples: s.allSamples.map((sample) => {
        if (sample.id !== sampleId) return sample;
        updated = { ...sample, pollutionStatus: status, pollutionNote: note ?? sample.pollutionNote };
        return updated;
      }),
    }));
    return updated;
  },
}));
