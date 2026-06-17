import { create } from 'zustand';
import type {
  ModelVersion,
  EvaluationSample,
  SafetyRule,
  CorrectionLog,
  ConfidenceInterval,
  PrecheckResult,
  ExportConfig,
  GroupedCI,
} from '@/types';
import { mockVersions } from '@/data/mockVersions';
import { generateMockSamples } from '@/data/mockSamples';
import { mockSafetyRules } from '@/data/mockSafetyRules';
import { mockCorrectionLogs } from '@/data/mockCorrectionLogs';
import { calculateConfidenceInterval, calculateGroupedCI } from '@/utils/confidence';
import { runAllSafetyChecks } from '@/utils/safetyRules';
import { runPrecheck as runPrecheckUtil } from '@/utils/precheck';
import { generatePdfReport } from '@/utils/exportPdf';
import { exportToXlsx } from '@/utils/exportXlsx';

const SAMPLES_STORAGE_KEY = 'confidence_app_samples';
const LOGS_STORAGE_KEY = 'confidence_app_logs';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

let samplesCache: EvaluationSample[] | null = null;

function getSamples(): EvaluationSample[] {
  if (samplesCache) return samplesCache;
  const stored = loadFromStorage<EvaluationSample[] | null>(SAMPLES_STORAGE_KEY, null);
  samplesCache = stored ?? generateMockSamples(42);
  if (!stored) saveToStorage(SAMPLES_STORAGE_KEY, samplesCache);
  return samplesCache;
}

function getLogs(): CorrectionLog[] {
  return loadFromStorage<CorrectionLog[]>(LOGS_STORAGE_KEY, mockCorrectionLogs);
}

interface AppState {
  versions: ModelVersion[];
  samples: EvaluationSample[];
  currentVersionId: string;
  safetyRules: SafetyRule[];
  correctionLogs: CorrectionLog[];
  currentSamples: EvaluationSample[];
  confidenceInterval: ConfidenceInterval;
  groupedCI: GroupedCI[];
  traceSample: EvaluationSample | null;
  traceModalOpen: boolean;
  setCurrentVersion: (id: string) => void;
  correctSample: (sampleId: string, newScore: number, reason: string) => void;
  runSafetyChecks: () => void;
  runPrecheck: () => PrecheckResult[];
  exportReport: (config: ExportConfig) => Promise<Blob>;
  setTraceSample: (sample: EvaluationSample | null) => void;
  setTraceModalOpen: (open: boolean) => void;
  showTrace: (sample: EvaluationSample) => void;
  closeTrace: () => void;
}

export const useAppStore = create<AppState>((set, get) => {
  const initialSamples = getSamples();
  const initialLogs = getLogs();
  const initialVersionId = mockVersions[0].id;
  const initialCurrentSamples = initialSamples.filter(
    (s) => s.modelVersionId === initialVersionId
  );
  const initialScores = initialCurrentSamples.map(
    (s) => s.humanCorrectedScore ?? s.modelScore
  );

  return {
    versions: mockVersions,
    samples: initialSamples,
    currentVersionId: initialVersionId,
    safetyRules: mockSafetyRules,
    correctionLogs: initialLogs,
    currentSamples: initialCurrentSamples,
    confidenceInterval: calculateConfidenceInterval(initialScores),
    groupedCI: calculateGroupedCI(initialCurrentSamples, 'reviewStatus'),
    traceSample: null,
    traceModalOpen: false,

    setCurrentVersion: (id: string) => {
      const filtered = get().samples.filter((s) => s.modelVersionId === id);
      const scores = filtered.map((s) => s.humanCorrectedScore ?? s.modelScore);
      set({
        currentVersionId: id,
        currentSamples: filtered,
        confidenceInterval: calculateConfidenceInterval(scores),
        groupedCI: calculateGroupedCI(filtered, 'reviewStatus'),
      });
    },

    correctSample: (sampleId: string, newScore: number, reason: string) => {
      const now = new Date().toISOString();
      const sample = get().samples.find((s) => s.id === sampleId);
      if (!sample) return;

      const updatedSamples = get().samples.map((s) =>
        s.id === sampleId
          ? {
              ...s,
              beforeScore: s.beforeScore ?? s.modelScore,
              afterScore: newScore,
              humanCorrectedScore: newScore,
              isCorrected: true,
              correctionReason: reason,
              correctedBy: '当前用户',
              correctedAt: now,
            }
          : s
      );

      const newLog: CorrectionLog = {
        id: `log_${Date.now()}`,
        sampleId,
        oldScore: sample.humanCorrectedScore ?? sample.modelScore,
        newScore,
        reason,
        operator: '当前用户',
        timestamp: now,
      };

      const updatedLogs = [...get().correctionLogs, newLog];
      samplesCache = updatedSamples;
      saveToStorage(SAMPLES_STORAGE_KEY, updatedSamples);
      saveToStorage(LOGS_STORAGE_KEY, updatedLogs);

      const { currentVersionId } = get();
      const filtered = updatedSamples.filter((s) => s.modelVersionId === currentVersionId);
      const scores = filtered.map((s) => s.humanCorrectedScore ?? s.modelScore);

      set({
        samples: updatedSamples,
        correctionLogs: updatedLogs,
        currentSamples: filtered,
        confidenceInterval: calculateConfidenceInterval(scores),
        groupedCI: calculateGroupedCI(filtered, 'reviewStatus'),
      });
    },

    runSafetyChecks: () => {
      const { currentSamples, safetyRules } = get();
      const updated = runAllSafetyChecks(currentSamples, safetyRules);
      set({ safetyRules: updated });
    },

    runPrecheck: () => {
      const { currentSamples, safetyRules, groupedCI } = get();
      return runPrecheckUtil(currentSamples, safetyRules, groupedCI);
    },

    exportReport: async (config: ExportConfig) => {
      const { samples, versions, safetyRules, groupedCI, currentSamples } = get();
      if (config.includeCharts) {
        const precheck = get().runPrecheck();
        return generatePdfReport(config, {
          versions,
          samples: currentSamples,
          rules: safetyRules,
          ci: groupedCI,
          precheck,
        });
      }
      return exportToXlsx(config, samples, versions, safetyRules);
    },

    setTraceSample: (sample: EvaluationSample | null) => {
      set({ traceSample: sample });
    },

    setTraceModalOpen: (open: boolean) => {
      set({ traceModalOpen: open });
    },

    showTrace: (sample: EvaluationSample) => {
      set({ traceSample: sample, traceModalOpen: true });
    },

    closeTrace: () => {
      set({ traceSample: null, traceModalOpen: false });
    },
  };
});

export default useAppStore;
