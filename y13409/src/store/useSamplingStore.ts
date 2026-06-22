import { create } from "zustand";
import type {
  SampleRecord,
  SamplingStep,
  UnstableRecord,
  ParamVersion,
  ChartPoint,
  UnstableStatus,
  SamplingResult,
} from "@/types";
import {
  mockSamples,
  mockSteps,
  mockUnstableRecords,
  mockParamVersions,
  generateChartPoints,
} from "@/data/mockData";

function computeSamplingResult(samples: SampleRecord[]): SamplingResult {
  const values = samples
    .map((s) => s.value ?? s.filledValue)
    .filter((v): v is number => v !== undefined);
  const sampledIds = ["s001", "s006", "s005", "s010"];
  const sampledValues = samples
    .filter((s) => sampledIds.includes(s.id))
    .map((s) => s.value ?? s.filledValue)
    .filter((v): v is number => v !== undefined);
  const sorted = [...values].sort((a, b) => a - b);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  return {
    totalCount: samples.length,
    sampledCount: sampledIds.length,
    sampleRate: sampledIds.length / samples.length,
    meanValue: sampledValues.reduce((a, b) => a + b, 0) / sampledValues.length,
    medianValue: median,
  };
}

interface SamplingStore {
  samples: SampleRecord[];
  steps: SamplingStep[];
  unstableRecords: UnstableRecord[];
  paramVersions: ParamVersion[];
  chartPoints: ChartPoint[];
  samplingResult: SamplingResult;
  currentStepIndex: number;
  highlightedSampleId: string | null;
  highlightedPointIndex: number | null;
  isParamDrawerOpen: boolean;
  onboardingDismissed: boolean;
  setCurrentStepIndex: (idx: number) => void;
  setHighlightedSampleId: (id: string | null) => void;
  setHighlightedPointIndex: (idx: number | null) => void;
  toggleParamDrawer: (open?: boolean) => void;
  dismissOnboarding: () => void;
  updateUnstableStatus: (id: string, status: UnstableStatus) => void;
  scrollToSample: (sampleId: string) => void;
}

const filledSamples = mockSamples.map((s) => {
  if (s.id === "s003") return { ...s, filledValue: 1185.7 };
  if (s.id === "s007") return { ...s, filledCategory: "未分类" };
  return s;
});

const initialSamplingResult = computeSamplingResult(filledSamples);

export const useSamplingStore = create<SamplingStore>((set) => ({
  samples: filledSamples,
  steps: mockSteps,
  unstableRecords: mockUnstableRecords,
  paramVersions: mockParamVersions,
  chartPoints: generateChartPoints(filledSamples),
  samplingResult: initialSamplingResult,
  currentStepIndex: 0,
  highlightedSampleId: null,
  highlightedPointIndex: null,
  isParamDrawerOpen: false,
  onboardingDismissed: false,

  setCurrentStepIndex: (idx) => set({ currentStepIndex: idx }),
  setHighlightedSampleId: (id) => set({ highlightedSampleId: id }),
  setHighlightedPointIndex: (idx) => set({ highlightedPointIndex: idx }),
  toggleParamDrawer: (open) =>
    set((s) => ({ isParamDrawerOpen: open ?? !s.isParamDrawerOpen })),
  dismissOnboarding: () => set({ onboardingDismissed: true }),

  updateUnstableStatus: (id, status) =>
    set((s) => ({
      unstableRecords: s.unstableRecords.map((u) =>
        u.id === id ? { ...u, status } : u
      ),
    })),

  scrollToSample: (sampleId) => {
    set({ highlightedSampleId: sampleId });
    setTimeout(() => {
      const el = document.getElementById(`sample-row-${sampleId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  },
}));
