import { create } from 'zustand';
import type { Sample, AuditBatch, QCThresholds, SampleVersion, VersionReason } from '@/types';
import { mockBatches, defaultQCThresholds } from '@/data/mockBatches';
import { mockSamples } from '@/data/mockSamples';
import { generateNewMetrics, reEvaluateContamination, runQCCheck, determineSampleStatus } from '@/utils/qcEngine';

interface AuditStore {
  batches: AuditBatch[];
  samples: Sample[];
  currentBatchId: string | null;
  qcThresholds: QCThresholds;
  selectedSampleIds: string[];

  setCurrentBatch: (batchId: string) => void;
  getBatchById: (batchId: string) => AuditBatch | undefined;
  getSampleById: (sampleId: string) => Sample | undefined;
  getSamplesByBatch: (batchId: string) => Sample[];
  getAbnormalSamples: (batchId: string) => Sample[];

  reRunSample: (sampleId: string) => void;
  reRunSelected: () => void;
  addSupplementarySample: (sample: Omit<Sample, 'id' | 'versions' | 'currentVersion'>) => void;
  manuallyConfirm: (sampleId: string, note: string, confirmed: boolean) => void;

  updateQCThresholds: (thresholds: Partial<QCThresholds>) => void;
  reEvaluateAllWithNewThresholds: (thresholds: Partial<QCThresholds>) => void;

  toggleSelectSample: (sampleId: string) => void;
  clearSelection: () => void;

  getSampleVersions: (sampleId: string) => SampleVersion[];
}

export const useAuditStore = create<AuditStore>((set, get) => ({
  batches: mockBatches,
  samples: mockSamples,
  currentBatchId: 'batch-001',
  qcThresholds: defaultQCThresholds,
  selectedSampleIds: [],

  setCurrentBatch: (batchId: string) => {
    set({ currentBatchId: batchId, selectedSampleIds: [] });
  },

  getBatchById: (batchId: string) => {
    return get().batches.find(b => b.id === batchId);
  },

  getSampleById: (sampleId: string) => {
    return get().samples.find(s => s.id === sampleId);
  },

  getSamplesByBatch: (batchId: string) => {
    return get().samples.filter(s => s.batchId === batchId);
  },

  getAbnormalSamples: (batchId: string) => {
    return get().samples.filter(
      s => s.batchId === batchId && (s.status === 'warning' || s.status === 'contaminated')
    );
  },

  reRunSample: (sampleId: string) => {
    const { samples } = get();
    const sampleIndex = samples.findIndex(s => s.id === sampleId);
    if (sampleIndex === -1) return;

    const sample = samples[sampleIndex];
    const newMetrics = generateNewMetrics(sample.qualityMetrics, 0.08);
    const newContamination = reEvaluateContamination(newMetrics, sample.contamination);
    const qcResult = runQCCheck(newMetrics, get().qcThresholds);
    const newStatus = determineSampleStatus(qcResult, newContamination, get().qcThresholds.contaminationConfidenceThreshold);

    const newVersion: SampleVersion = {
      version: sample.currentVersion + 1,
      timestamp: new Date().toISOString(),
      reason: 're_run' as VersionReason,
      qualityMetrics: newMetrics,
      contamination: newContamination,
      status: newStatus,
    };

    const updatedSamples = [...samples];
    updatedSamples[sampleIndex] = {
      ...sample,
      qualityMetrics: newMetrics,
      contamination: newContamination,
      status: newStatus,
      currentVersion: newVersion.version,
      versions: [...sample.versions, newVersion],
    };

    const batchId = sample.batchId;
    const batchSamples = updatedSamples.filter(s => s.batchId === batchId);
    const abnormalCount = batchSamples.filter(s => s.status === 'warning' || s.status === 'contaminated').length;
    const contaminationRate = Math.round((abnormalCount / batchSamples.length) * 1000) / 10;

    const updatedBatches = get().batches.map(b =>
      b.id === batchId
        ? { ...b, abnormalCount, contaminationRate, status: 'needs_review' as const }
        : b
    );

    set({ samples: updatedSamples, batches: updatedBatches });
  },

  reRunSelected: () => {
    const { selectedSampleIds, reRunSample } = get();
    selectedSampleIds.forEach(id => reRunSample(id));
  },

  addSupplementarySample: (sampleData) => {
    const { samples, batches, qcThresholds } = get();
    const newId = `smp-${String(samples.length + 1).padStart(3, '0')}`;

    const qcResult = runQCCheck(sampleData.qualityMetrics, qcThresholds);
    const status = determineSampleStatus(qcResult, sampleData.contamination, qcThresholds.contaminationConfidenceThreshold);

    const initialVersion: SampleVersion = {
      version: 1,
      timestamp: new Date().toISOString(),
      reason: 'supplementary' as VersionReason,
      qualityMetrics: sampleData.qualityMetrics,
      contamination: sampleData.contamination,
      status,
    };

    const newSample: Sample = {
      ...sampleData,
      id: newId,
      status,
      versions: [initialVersion],
      currentVersion: 1,
    };

    const batchId = sampleData.batchId;
    const batchSamples = [...samples.filter(s => s.batchId === batchId), newSample];
    const abnormalCount = batchSamples.filter(s => s.status === 'warning' || s.status === 'contaminated').length;
    const contaminationRate = Math.round((abnormalCount / batchSamples.length) * 1000) / 10;

    const updatedBatches = batches.map(b =>
      b.id === batchId
        ? { ...b, sampleCount: batchSamples.length, abnormalCount, contaminationRate, status: 'needs_review' as const }
        : b
    );

    set({ samples: [...samples, newSample], batches: updatedBatches });
  },

  manuallyConfirm: (sampleId: string, note: string, confirmed: boolean) => {
    const { samples, batches } = get();
    const sampleIndex = samples.findIndex(s => s.id === sampleId);
    if (sampleIndex === -1) return;

    const sample = samples[sampleIndex];
    const newStatus = confirmed ? 'manually_confirmed' : 'contaminated';

    const updatedSamples = [...samples];
    updatedSamples[sampleIndex] = {
      ...sample,
      status: newStatus,
      manualNote: note,
    };

    const batchId = sample.batchId;
    const batchSamples = updatedSamples.filter(s => s.batchId === batchId);
    const abnormalCount = batchSamples.filter(s => s.status === 'warning' || s.status === 'contaminated').length;
    const contaminationRate = Math.round((abnormalCount / batchSamples.length) * 1000) / 10;

    const allReviewed = batchSamples.every(
      s => s.status === 'normal' || s.status === 'manually_confirmed' || s.status === 'contaminated'
    );

    const updatedBatches = batches.map(b =>
      b.id === batchId
        ? { ...b, abnormalCount, contaminationRate, status: allReviewed ? 'completed' as const : 'needs_review' as const }
        : b
    );

    set({ samples: updatedSamples, batches: updatedBatches });
  },

  updateQCThresholds: (thresholds: Partial<QCThresholds>) => {
    set({ qcThresholds: { ...get().qcThresholds, ...thresholds } });
  },

  reEvaluateAllWithNewThresholds: (thresholds: Partial<QCThresholds>) => {
    const { samples, qcThresholds } = get();
    const newThresholds = { ...qcThresholds, ...thresholds };

    const updatedSamples = samples.map(sample => {
      const qcResult = runQCCheck(sample.qualityMetrics, newThresholds);
      const newStatus = determineSampleStatus(qcResult, sample.contamination, newThresholds.contaminationConfidenceThreshold);

      if (newStatus === sample.status) return sample;

      const newVersion: SampleVersion = {
        version: sample.currentVersion + 1,
        timestamp: new Date().toISOString(),
        reason: 'qc_param_change' as VersionReason,
        qualityMetrics: { ...sample.qualityMetrics },
        contamination: { ...sample.contamination },
        status: newStatus,
      };

      return {
        ...sample,
        status: newStatus,
        currentVersion: newVersion.version,
        versions: [...sample.versions, newVersion],
      };
    });

    const updatedBatches = get().batches.map(batch => {
      const batchSamples = updatedSamples.filter(s => s.batchId === batch.id);
      const abnormalCount = batchSamples.filter(s => s.status === 'warning' || s.status === 'contaminated').length;
      const contaminationRate = Math.round((abnormalCount / batchSamples.length) * 1000) / 10;

      return {
        ...batch,
        abnormalCount,
        contaminationRate,
        status: 'needs_review' as const,
        qcThresholds: batch.id === get().currentBatchId ? newThresholds : batch.qcThresholds,
      };
    });

    set({
      samples: updatedSamples,
      batches: updatedBatches,
      qcThresholds: newThresholds,
    });
  },

  toggleSelectSample: (sampleId: string) => {
    const { selectedSampleIds } = get();
    if (selectedSampleIds.includes(sampleId)) {
      set({ selectedSampleIds: selectedSampleIds.filter(id => id !== sampleId) });
    } else {
      set({ selectedSampleIds: [...selectedSampleIds, sampleId] });
    }
  },

  clearSelection: () => {
    set({ selectedSampleIds: [] });
  },

  getSampleVersions: (sampleId: string) => {
    const sample = get().samples.find(s => s.id === sampleId);
    return sample?.versions || [];
  },
}));
