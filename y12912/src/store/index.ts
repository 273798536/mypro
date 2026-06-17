import { create } from 'zustand';
import { Batch, Run, Sample, Cluster, Anomaly, Correction, ParamConfig, TimelineEvent, AnomalyStatus, CorrectionAction } from '../types';
import { MOCK_DATA } from '../mock';
import { generateId, calculateFingerprint } from '../utils';
import { parseSplitList, prepareSamplesForRun } from '../utils/parser';
import { runClustering } from '../utils/clustering';
import { STORAGE_KEYS, ANOMALY_TYPE_MAPPING } from '../constants';

interface WorkflowState {
  batches: Batch[];
  runs: Run[];
  samples: Sample[];
  clusters: Cluster[];
  anomalies: Anomaly[];
  corrections: Correction[];

  selectedBatchId: string | null;
  selectedRunId: string | null;
  selectedAnomalyId: string | null;

  isLoading: boolean;
  error: string | null;

  initMockData: () => void;

  selectBatch: (batchId: string | null) => void;
  selectRun: (runId: string | null) => void;
  selectAnomaly: (anomalyId: string | null) => void;

  importBatch: (fileName: string, content: string) => { batch: Batch; isDuplicate: boolean };
  createRun: (batchId: string, promptVersion: string, paramConfig: ParamConfig) => Run;

  getBatchRuns: (batchId: string) => Run[];
  getCurrentRun: () => Run | null;
  getRunSamples: (runId: string) => Sample[];
  getRunClusters: (runId: string) => Cluster[];
  getRunAnomalies: (runId: string) => Anomaly[];
  getClusterAnomalies: (clusterId: string) => Anomaly[];
  getAnomalyCorrections: (anomalyId: string) => Correction[];
  getSampleCorrections: (sampleId: string) => Correction[];

  getAnomalyTimeline: (anomalyId: string) => TimelineEvent[];

  addCorrection: (params: {
    anomalyId: string;
    sampleId: string;
    runId: string;
    action: CorrectionAction;
    reason: string;
    operator: string;
    note?: string;
    newStatus?: AnomalyStatus;
  }) => Correction;

  updateAnomalyStatus: (anomalyId: string, status: AnomalyStatus) => void;

  getUnifiedStats: (runId: string) => {
    dedup: Run['dedupStats'];
    distribution: Run['distributionStats'];
    totalAnomalies: number;
    pendingAnomalies: number;
    fixedAnomalies: number;
  } | null;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  batches: [],
  runs: [],
  samples: [],
  clusters: [],
  anomalies: [],
  corrections: [],

  selectedBatchId: null,
  selectedRunId: null,
  selectedAnomalyId: null,

  isLoading: false,
  error: null,

  initMockData: () => {
    const data = MOCK_DATA;
    set({
      batches: data.batches,
      runs: data.runs,
      samples: data.samples,
      clusters: data.clusters,
      anomalies: data.anomalies,
      corrections: data.corrections,
      selectedBatchId: data.batches[0]?.id ?? null,
      selectedRunId: data.runs.find(r => r.batchId === data.batches[0]?.id && r.version === data.batches[0]?.latestRunVersion)?.id ?? null
    });
  },

  selectBatch: (batchId) => {
    const state = get();
    const runs = state.getBatchRuns(batchId ?? '');
    const batch = state.batches.find(b => b.id === batchId);
    const latestRun = runs.find(r => r.version === batch?.latestRunVersion) ?? runs[runs.length - 1];
    set({
      selectedBatchId: batchId,
      selectedRunId: latestRun?.id ?? null,
      selectedAnomalyId: null
    });
  },

  selectRun: (runId) => {
    set({ selectedRunId: runId, selectedAnomalyId: null });
  },

  selectAnomaly: (anomalyId) => {
    set({ selectedAnomalyId: anomalyId });
  },

  importBatch: (fileName, content) => {
    const fingerprint = calculateFingerprint(content);
    const existing = get().batches.find(b => b.fingerprint === fingerprint);

    if (existing) {
      const updatedBatches = get().batches.map(b =>
        b.id === existing.id
          ? { ...b, updatedAt: new Date().toISOString() }
          : b
      );
      set({ batches: updatedBatches });
      return { batch: { ...existing, updatedAt: new Date().toISOString() }, isDuplicate: true };
    }

    const parsed = parseSplitList(fileName, content);

    const newBatch: Batch = {
      id: generateId(),
      fingerprint,
      name: fileName.replace(/\.[^.]+$/, ''),
      sourceFile: fileName,
      rawContent: content,
      parsedSamples: parsed.samples,
      importMetadata: parsed.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runCount: 0,
      latestRunVersion: undefined
    };

    set(state => ({ batches: [...state.batches, newBatch] }));
    return { batch: newBatch, isDuplicate: false };
  },

  createRun: (batchId, promptVersion, paramConfig) => {
    const state = get();
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch) {
      throw new Error('未找到对应的数据批次');
    }

    const newVersion = (batch.runCount ?? 0) + 1;
    const runId = generateId();

    const { samples, dedupStats, distributionStats } = prepareSamplesForRun(batch.parsedSamples, runId);
    const { clusters, anomalies } = runClustering(samples, paramConfig, runId);

    const newRun: Run = {
      id: runId,
      batchId,
      version: newVersion,
      promptVersion,
      executedAt: new Date().toISOString(),
      executedBy: '当前用户',
      dedupStats,
      distributionStats,
      paramConfig
    };

    set(state => ({
      runs: [...state.runs, newRun],
      samples: [...state.samples, ...samples],
      clusters: [...state.clusters, ...clusters],
      anomalies: [...state.anomalies, ...anomalies],
      batches: state.batches.map(b =>
        b.id === batchId
          ? { ...b, runCount: newVersion, latestRunVersion: newVersion, updatedAt: new Date().toISOString() }
          : b
      ),
      selectedRunId: runId
    }));

    return newRun;
  },

  getBatchRuns: (batchId) => {
    return get().runs
      .filter(r => r.batchId === batchId)
      .sort((a, b) => b.version - a.version);
  },

  getCurrentRun: () => {
    const { selectedRunId, runs } = get();
    return runs.find(r => r.id === selectedRunId) ?? null;
  },

  getRunSamples: (runId) => {
    return get().samples.filter(s => s.runId === runId);
  },

  getRunClusters: (runId) => {
    return get().clusters.filter(c => c.runId === runId);
  },

  getRunAnomalies: (runId) => {
    return get().anomalies.filter(a => a.runId === runId);
  },

  getClusterAnomalies: (clusterId) => {
    return get().anomalies.filter(a => a.clusterId === clusterId);
  },

  getAnomalyCorrections: (anomalyId) => {
    return get().corrections
      .filter(c => c.anomalyId === anomalyId)
      .sort((a, b) => new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime());
  },

  getSampleCorrections: (sampleId) => {
    return get().corrections
      .filter(c => c.sampleId === sampleId)
      .sort((a, b) => new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime());
  },

  getAnomalyTimeline: (anomalyId) => {
    const state = get();
    const anomaly = state.anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return [];

    const run = state.runs.find(r => r.id === anomaly.runId);
    const batch = state.batches.find(b => b.id === run?.batchId);
    const cluster = state.clusters.find(c => c.id === anomaly.clusterId);
    const sample = state.samples.find(s => s.id === anomaly.sampleId);
    const corrections = state.getAnomalyCorrections(anomalyId);

    const events: TimelineEvent[] = [];

    if (batch) {
      events.push({
        id: `import-${batch.id}`,
        timestamp: batch.createdAt,
        type: 'import',
        title: '数据批次导入',
        description: `导入文件：${batch.sourceFile}，共 ${batch.importMetadata.totalCount} 条样本`,
        details: {
          fingerprint: batch.fingerprint,
          fileName: batch.sourceFile,
          totalSamples: batch.importMetadata.totalCount,
          trainCount: batch.importMetadata.trainCount,
          valCount: batch.importMetadata.valCount,
          testCount: batch.importMetadata.testCount,
          duplicateCount: batch.importMetadata.duplicateCount
        },
        operator: '系统'
      });
    }

    if (run) {
      events.push({
        id: `run-${run.id}`,
        timestamp: run.executedAt,
        type: 'run',
        title: `第 ${run.version} 次聚类运行`,
        description: `提示词版本: ${run.promptVersion}，执行人: ${run.executedBy}`,
        details: {
          promptVersion: run.promptVersion,
          paramConfig: run.paramConfig,
          dedupStats: run.dedupStats,
          distributionStats: run.distributionStats
        },
        operator: run.executedBy
      });
    }

    if (cluster) {
      const typeInfo = ANOMALY_TYPE_MAPPING[cluster.anomalyType];
      events.push({
        id: `cluster-${cluster.id}`,
        timestamp: run?.executedAt ?? new Date().toISOString(),
        type: 'cluster',
        title: '异常聚类检出',
        description: `${typeInfo.title}，包含 ${cluster.size} 条样本，严重程度 ${Math.round(cluster.severityScore * 100)}%`,
        details: {
          clusterSummary: cluster.summary,
          anomalyType: cluster.anomalyType,
          severity: cluster.severityScore,
          size: cluster.size,
          representativeSample: sample?.content
        }
      });
    }

    corrections.forEach(correction => {
      events.push({
        id: `correction-${correction.id}`,
        timestamp: correction.correctedAt,
        type: 'correction',
        title: '人工处理记录',
        description: `操作: ${correction.action}，原因: ${correction.reason}`,
        details: {
          action: correction.action,
          reason: correction.reason,
          note: correction.note
        },
        operator: correction.operator
      });
    });

    return events.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  },

  addCorrection: ({ anomalyId, sampleId, runId, action, reason, operator, note = '', newStatus }) => {
    const correction: Correction = {
      id: generateId(),
      sampleId,
      anomalyId,
      runId,
      action,
      reason,
      operator,
      correctedAt: new Date().toISOString(),
      note
    };

    set(state => ({
      corrections: [...state.corrections, correction],
      anomalies: newStatus
        ? state.anomalies.map(a => a.id === anomalyId ? { ...a, status: newStatus } : a)
        : state.anomalies
    }));

    return correction;
  },

  updateAnomalyStatus: (anomalyId, status) => {
    set(state => ({
      anomalies: state.anomalies.map(a =>
        a.id === anomalyId ? { ...a, status } : a
      )
    }));
  },

  getUnifiedStats: (runId) => {
    const state = get();
    const run = state.runs.find(r => r.id === runId);
    if (!run) return null;

    const runAnomalies = state.getRunAnomalies(runId);

    return {
      dedup: run.dedupStats,
      distribution: run.distributionStats,
      totalAnomalies: runAnomalies.length,
      pendingAnomalies: runAnomalies.filter(a => a.status === 'pending').length,
      fixedAnomalies: runAnomalies.filter(a => a.status === 'fixed').length
    };
  }
}));
