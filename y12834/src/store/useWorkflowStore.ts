import { create } from 'zustand';
import type {
  WorkflowRun,
  Sample,
  SampleVersion,
  ImageAnnotation,
  Anomaly,
  CorrectionLog,
} from '../types';
import {
  getWorkflowRuns,
  setWorkflowRuns,
  getSamples,
  setSamples,
  getSampleVersions,
  setSampleVersions,
  getImageAnnotations,
  setImageAnnotations,
  getAnomalies,
  setAnomalies,
  getCorrectionLogs,
  setCorrectionLogs,
} from '../utils/storage';
import { generateId, generateVersionLabel, generateRunId } from '../utils/version';
import { detectAnomalies } from '../utils/anomaly';

interface WorkflowState {
  runs: WorkflowRun[];
  currentRun: WorkflowRun | null;
  runProgress: number;
  isRunning: boolean;
  init: () => void;
  getRunById: (id: string) => WorkflowRun | undefined;
  getRecentRuns: (limit: number) => WorkflowRun[];
  startRun: (config: { modelVersion: string; groupFilter: string | null; createdBy: string }) => void;
  compareRuns: (
    runId1: string,
    runId2: string
  ) => {
    samples: { added: Sample[]; removed: Sample[]; modified: Sample[] };
    annotations: { added: ImageAnnotation[]; removed: ImageAnnotation[]; modified: ImageAnnotation[] };
    metrics: {
      run1: { totalSamples: number; totalAnnotations: number; totalAnomalies: number };
      run2: { totalSamples: number; totalAnnotations: number; totalAnomalies: number };
    };
  };
  applyHumanCorrection: (
    versionId: string,
    corrections: { fieldName: string; oldValue: string; newValue: string; reason: string }[],
    createdBy: string
  ) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  runs: [],
  currentRun: null,
  runProgress: 0,
  isRunning: false,

  init: () => {
    const runs = getWorkflowRuns();
    set({ runs });
  },

  getRunById: (id) => {
    return get().runs.find((r) => r.id === id);
  },

  getRecentRuns: (limit) => {
    return [...get().runs]
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, limit);
  },

  startRun: (config) => {
    const runId = generateRunId();
    const versionLabel = generateVersionLabel();
    const now = new Date().toISOString();

    const newRun: WorkflowRun = {
      id: runId,
      version_label: versionLabel,
      model_version: config.modelVersion,
      group_filter: config.groupFilter,
      status: 'running',
      started_at: now,
      completed_at: null,
      created_by: config.createdBy,
    };

    set((state) => {
      const newRuns = [...state.runs, newRun];
      setWorkflowRuns(newRuns);
      return {
        runs: newRuns,
        currentRun: newRun,
        isRunning: true,
        runProgress: 0,
      };
    });

    const progressSteps = [10, 25, 40, 55, 70, 85, 95, 100];
    let stepIndex = 0;

    const progressInterval = setInterval(() => {
      if (stepIndex >= progressSteps.length) {
        clearInterval(progressInterval);
        return;
      }

      const progress = progressSteps[stepIndex];
      stepIndex++;

      set((state) => ({ runProgress: progress }));

      if (progress === 100) {
        clearInterval(progressInterval);

        const samples = getSamples();
        const existingVersions = getSampleVersions();
        const existingAnnotations = getImageAnnotations();

        const filteredSamples = config.groupFilter
          ? samples.filter((s) => s.group === config.groupFilter)
          : samples;

        const newVersions: SampleVersion[] = filteredSamples.map((sample) => {
          const sampleVersions = existingVersions.filter((v) => v.sample_id === sample.id);
          const maxVersion = sampleVersions.reduce(
            (max, v) => Math.max(max, v.version_number),
            0
          );
          return {
            id: generateId('sampver'),
            sample_id: sample.id,
            version_number: maxVersion + 1,
            run_id: runId,
            status: 'ai_reviewed',
            created_at: new Date().toISOString(),
            created_by: 'AI-System',
          };
        });

        const newAnnotations: ImageAnnotation[] = [];
        const labels = ['肝肿大', '脾坏死', '肾囊肿', '肠道炎症', '鳃丝增生', '心肌病变'];

        newVersions.forEach((version, idx) => {
          const numAnnotations = 2 + (idx % 4);
          for (let j = 0; j < numAnnotations; j++) {
            const isLowConf = (idx + j) % 5 === 0;
            newAnnotations.push({
              id: generateId('ann'),
              version_id: version.id,
              x: 50 + j * 80 + (idx % 3) * 20,
              y: 40 + j * 60 + (idx % 2) * 15,
              width: 60 + (j % 3) * 20,
              height: 50 + (j % 2) * 25,
              label: labels[(idx + j) % labels.length],
              confidence: isLowConf ? 0.35 + (j % 3) * 0.08 : 0.72 + (idx % 5) * 0.05,
              source: 'ai',
              created_at: new Date().toISOString(),
            });
          }
        });

        const newAnomalies = detectAnomalies(filteredSamples, newAnnotations, runId);

        const updatedSamples = samples.map((sample) => {
          const newVersion = newVersions.find((v) => v.sample_id === sample.id);
          if (newVersion) {
            return {
              ...sample,
              current_version_id: newVersion.id,
              updated_at: new Date().toISOString(),
            };
          }
          return sample;
        });

        const allVersions = [...existingVersions, ...newVersions];
        const allAnnotations = [...existingAnnotations, ...newAnnotations];
        const existingAnomalies = getAnomalies();
        const allAnomalies = [...existingAnomalies, ...newAnomalies];

        setSamples(updatedSamples);
        setSampleVersions(allVersions);
        setImageAnnotations(allAnnotations);
        setAnomalies(allAnomalies);

        set((state) => {
          const completedRun: WorkflowRun = {
            ...newRun,
            status: 'completed',
            completed_at: new Date().toISOString(),
          };
          const updatedRuns = state.runs.map((r) => (r.id === runId ? completedRun : r));
          setWorkflowRuns(updatedRuns);
          return {
            runs: updatedRuns,
            currentRun: completedRun,
            isRunning: false,
          };
        });
      }
    }, 300);
  },

  compareRuns: (runId1, runId2) => {
    const versions = getSampleVersions();
    const annotations = getImageAnnotations();
    const samples = getSamples();
    const anomalies = getAnomalies();

    const versions1 = versions.filter((v) => v.run_id === runId1);
    const versions2 = versions.filter((v) => v.run_id === runId2);

    const sampleIds1 = new Set(versions1.map((v) => v.sample_id));
    const sampleIds2 = new Set(versions2.map((v) => v.sample_id));

    const samples1 = samples.filter((s) => sampleIds1.has(s.id));
    const samples2 = samples.filter((s) => sampleIds2.has(s.id));

    const addedSamples = samples2.filter((s) => !sampleIds1.has(s.id));
    const removedSamples = samples1.filter((s) => !sampleIds2.has(s.id));
    const commonSampleIds = [...sampleIds1].filter((id) => sampleIds2.has(id));
    const modifiedSamples = commonSampleIds
      .map((id) => samples.find((s) => s.id === id))
      .filter((s): s is Sample => s !== undefined);

    const versionIds1 = new Set(versions1.map((v) => v.id));
    const versionIds2 = new Set(versions2.map((v) => v.id));

    const annotations1 = annotations.filter((a) => versionIds1.has(a.version_id));
    const annotations2 = annotations.filter((a) => versionIds2.has(a.version_id));

    const annIds1 = new Set(annotations1.map((a) => a.id));
    const annIds2 = new Set(annotations2.map((a) => a.id));

    const addedAnnotations = annotations2.filter((a) => !annIds1.has(a.id));
    const removedAnnotations = annotations1.filter((a) => !annIds2.has(a.id));
    const modifiedAnnotations = [...annIds1]
      .filter((id) => annIds2.has(id))
      .map((id) => annotations.find((a) => a.id === id))
      .filter((a): a is ImageAnnotation => a !== undefined);

    const anomalies1 = anomalies.filter((a) => a.run_id === runId1);
    const anomalies2 = anomalies.filter((a) => a.run_id === runId2);

    return {
      samples: { added: addedSamples, removed: removedSamples, modified: modifiedSamples },
      annotations: {
        added: addedAnnotations,
        removed: removedAnnotations,
        modified: modifiedAnnotations,
      },
      metrics: {
        run1: {
          totalSamples: samples1.length,
          totalAnnotations: annotations1.length,
          totalAnomalies: anomalies1.length,
        },
        run2: {
          totalSamples: samples2.length,
          totalAnnotations: annotations2.length,
          totalAnomalies: anomalies2.length,
        },
      },
    };
  },

  applyHumanCorrection: (versionId, corrections, createdBy) => {
    const existingLogs = getCorrectionLogs();
    const now = new Date().toISOString();

    const newLogs: CorrectionLog[] = corrections.map((c) => ({
      id: generateId('corr'),
      version_id: versionId,
      field_name: c.fieldName,
      old_value: c.oldValue,
      new_value: c.newValue,
      reason: c.reason,
      created_at: now,
      created_by: createdBy,
    }));

    const allLogs = [...existingLogs, ...newLogs];
    setCorrectionLogs(allLogs);

    const versions = getSampleVersions();
    const updatedVersions = versions.map((v) =>
      v.id === versionId ? { ...v, status: 'human_corrected' as const } : v
    );
    setSampleVersions(updatedVersions);

    set((state) => ({
      runs: state.runs,
    }));
  },
}));
