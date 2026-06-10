import { create } from 'zustand';
import type {
  Sample,
  EstimationVersion,
  Correction,
  PathologyNote,
  SequencingResult,
  LineageEvent,
  AnomalyRecord,
  ExportRecord,
  Group,
  SampleStatus,
  LineageEventType,
} from '../types';
import {
  mockSamples,
  mockEstimationVersions,
  mockCorrections,
  mockPathologyNotes,
  mockSequencingResults,
  mockLineageEvents,
  mockAnomalies,
  mockExportRecords,
  mockGroups,
} from '../mock/data';

interface AppState {
  samples: Sample[];
  estimationVersions: EstimationVersion[];
  corrections: Correction[];
  pathologyNotes: PathologyNote[];
  sequencingResults: SequencingResult[];
  lineageEvents: LineageEvent[];
  anomalies: AnomalyRecord[];
  exportRecords: ExportRecord[];
  groups: Group[];

  getSampleById: (id: string) => Sample | undefined;
  getSampleVersions: (sampleId: string) => EstimationVersion[];
  getLatestVersion: (sampleId: string) => EstimationVersion | undefined;
  getSampleCorrections: (sampleId: string) => Correction[];
  getSampleNotes: (sampleId: string) => PathologyNote[];
  getLatestNote: (sampleId: string) => PathologyNote | undefined;
  getSampleSequencing: (sampleId: string) => SequencingResult[];
  getSampleLineage: (sampleId: string) => LineageEvent[];
  getSampleExports: (sampleId: string) => ExportRecord[];
  getGroupById: (id: string) => Group | undefined;
  getAnomalyByBarcode: (barcode: string) => AnomalyRecord | undefined;

  runEstimation: (sampleId: string) => Promise<void>;
  addCorrection: (sampleId: string, versionId: string, correctedRate: number, reason: string, note: string, operator: string) => void;
  updatePathologyNote: (sampleId: string, content: string, author: string) => void;
  updateSampleStatus: (sampleId: string, status: SampleStatus) => void;
  addLineageEvent: (sampleId: string, eventType: LineageEventType, description: string, operator: string, beforeState?: Record<string, any>, afterState?: Record<string, any>, versionId?: string) => void;
  exportReport: (sampleId: string, format: 'pdf' | 'excel' | 'print', operator: string) => void;

  completeAnomalyStep: (anomalyId: string, stepNumber: 1 | 2 | 3, result: string, operator: string) => void;
  resolveAnomaly: (anomalyId: string, finalConclusion: string, operator: string) => void;

  getDashboardStats: () => {
    totalSamples: number;
    pendingEstimation: number;
    anomalies: number;
    completedToday: number;
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  samples: mockSamples,
  estimationVersions: mockEstimationVersions,
  corrections: mockCorrections,
  pathologyNotes: mockPathologyNotes,
  sequencingResults: mockSequencingResults,
  lineageEvents: mockLineageEvents,
  anomalies: mockAnomalies,
  exportRecords: mockExportRecords,
  groups: mockGroups,

  getSampleById: (id) => get().samples.find((s) => s.id === id),

  getSampleVersions: (sampleId) =>
    get()
      .estimationVersions.filter((v) => v.sampleId === sampleId)
      .sort((a, b) => b.version - a.version),

  getLatestVersion: (sampleId) => {
    const versions = get().getSampleVersions(sampleId);
    return versions[0];
  },

  getSampleCorrections: (sampleId) =>
    get()
      .corrections.filter((c) => c.sampleId === sampleId)
      .sort((a, b) => new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime()),

  getSampleNotes: (sampleId) =>
    get()
      .pathologyNotes.filter((n) => n.sampleId === sampleId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

  getLatestNote: (sampleId) => get().getSampleNotes(sampleId)[0],

  getSampleSequencing: (sampleId) =>
    get()
      .sequencingResults.filter((s) => s.sampleId === sampleId)
      .sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime()),

  getSampleLineage: (sampleId) =>
    get()
      .lineageEvents.filter((e) => e.sampleId === sampleId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),

  getSampleExports: (sampleId) =>
    get()
      .exportRecords.filter((e) => e.sampleId === sampleId)
      .sort((a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()),

  getGroupById: (id) => get().groups.find((g) => g.id === id),

  getAnomalyByBarcode: (barcode) => get().anomalies.find((a) => a.barcode === barcode),

  runEstimation: async (sampleId: string) => {
    const sample = get().getSampleById(sampleId);
    if (!sample) return;

    const oldStatus = sample.status;
    const oldVersion = sample.currentVersion;

    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === sampleId ? { ...s, status: 'estimating' as SampleStatus } : s
      ),
    }));

    get().addLineageEvent(
      sampleId,
      oldVersion === 0 ? 'estimated' : 're_estimated',
      'AI估算中...',
      'AI系统',
      { status: oldStatus }
    );

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newVersion = oldVersion + 1;
    const baseRate = 20 + Math.random() * 70;
    const positiveRate = Math.round(baseRate * 10) / 10;
    const ciLow = Math.round((positiveRate - 3 - Math.random() * 2) * 10) / 10;
    const ciHigh = Math.round((positiveRate + 3 + Math.random() * 2) * 10) / 10;

    const newEstVersion: EstimationVersion = {
      id: `ev-${Date.now()}`,
      sampleId,
      version: newVersion,
      positiveRate,
      confidenceInterval: [ciLow, ciHigh],
      algorithm: 'IHC-AI-Pro',
      algorithmVersion: 'v2.1.0',
      parameters: { threshold: 'moderate', roiSize: 'auto' },
      cellCount: Math.floor(8000 + Math.random() * 10000),
      positiveCellCount: Math.floor(8000 * (positiveRate / 100)),
      tissueArea: Math.round((2 + Math.random() * 5) * 10) / 10,
      stainingIntensity: positiveRate > 50 ? 'strong' : positiveRate > 20 ? 'moderate' : 'weak',
      estimatedAt: new Date().toISOString(),
      estimatedBy: 'ai',
      conclusion: `AI估算阳性率约${positiveRate}%`,
    };

    const latestNote = get().getLatestNote(sampleId);
    const noteContext = latestNote ? latestNote.content : '';
    let conclusion = '';
    if (positiveRate >= 50) {
      conclusion = `PD-L1高表达，TPS约${positiveRate}%，建议免疫治疗`;
    } else if (positiveRate >= 10) {
      conclusion = `PD-L1中等表达，TPS约${positiveRate}%，可考虑免疫联合治疗`;
    } else {
      conclusion = `PD-L1低表达，TPS约${positiveRate}%`;
    }
    newEstVersion.conclusion = conclusion;

    set((state) => ({
      estimationVersions: [...state.estimationVersions, newEstVersion],
      samples: state.samples.map((s) =>
        s.id === sampleId
          ? {
              ...s,
              status: 'estimated' as SampleStatus,
              currentVersion: newVersion,
              latestPositiveRate: positiveRate,
              latestConclusion: conclusion,
              updatedAt: new Date().toISOString(),
            }
          : s
      ),
    }));

    get().addLineageEvent(
      sampleId,
      oldVersion === 0 ? 'estimated' : 're_estimated',
      `AI估算完成，v${newVersion}版本，阳性率${positiveRate}%`,
      'AI系统',
      { status: oldStatus, version: oldVersion },
      { status: 'estimated', version: newVersion, positiveRate },
      newEstVersion.id
    );
  },

  addCorrection: (sampleId, versionId, correctedRate, reason, note, operator) => {
    const version = get().estimationVersions.find((v) => v.id === versionId);
    if (!version) return;

    const originalRate = version.positiveRate;

    const correction: Correction = {
      id: `c-${Date.now()}`,
      sampleId,
      versionId,
      originalRate,
      correctedRate,
      reason,
      note,
      correctedBy: operator,
      correctedAt: new Date().toISOString(),
    };

    const newVersion: EstimationVersion = {
      ...version,
      id: `ev-${Date.now()}`,
      version: version.version + 1,
      positiveRate: correctedRate,
      estimatedBy: 'human',
      conclusion: version.conclusion + '（人工修正）',
      estimatedAt: new Date().toISOString(),
    };

    set((state) => ({
      corrections: [...state.corrections, correction],
      estimationVersions: [...state.estimationVersions, newVersion],
      samples: state.samples.map((s) =>
        s.id === sampleId
          ? {
              ...s,
              status: 'corrected' as SampleStatus,
              currentVersion: newVersion.version,
              latestPositiveRate: correctedRate,
              latestConclusion: newVersion.conclusion,
              updatedAt: new Date().toISOString(),
            }
          : s
      ),
    }));

    get().addLineageEvent(
      sampleId,
      'corrected',
      `人工修正阳性率从${originalRate}%至${correctedRate}%`,
      operator,
      { positiveRate: originalRate, version: version.version },
      { positiveRate: correctedRate, version: newVersion.version },
      newVersion.id
    );
  },

  updatePathologyNote: (sampleId, content, author) => {
    const latestNote = get().getLatestNote(sampleId);
    const oldContent = latestNote?.content || '';

    const newNote: PathologyNote = {
      id: `pn-${Date.now()}`,
      sampleId,
      content,
      author,
      createdAt: new Date().toISOString(),
      previousVersionId: latestNote?.id,
      isLatest: true,
    };

    set((state) => ({
      pathologyNotes: [
        ...state.pathologyNotes.map((n) =>
          n.sampleId === sampleId ? { ...n, isLatest: false } : n
        ),
        newNote,
      ],
      samples: state.samples.map((s) =>
        s.id === sampleId ? { ...s, updatedAt: new Date().toISOString() } : s
      ),
    }));

    get().addLineageEvent(
      sampleId,
      'note_updated',
      '病理备注已更新',
      author,
      { noteContent: oldContent },
      { noteContent: content }
    );
  },

  updateSampleStatus: (sampleId, status) => {
    const sample = get().getSampleById(sampleId);
    if (!sample) return;

    const oldStatus = sample.status;

    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === sampleId
          ? { ...s, status, updatedAt: new Date().toISOString() }
          : s
      ),
    }));

    get().addLineageEvent(
      sampleId,
      'status_changed',
      `状态从${getStatusLabel(oldStatus)}变更为${getStatusLabel(status)}`,
      '系统',
      { status: oldStatus },
      { status }
    );
  },

  addLineageEvent: (sampleId, eventType, description, operator, beforeState, afterState, versionId) => {
    const event: LineageEvent = {
      id: `le-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sampleId,
      eventType,
      description,
      beforeState,
      afterState,
      operator,
      timestamp: new Date().toISOString(),
      versionId,
    };

    set((state) => ({
      lineageEvents: [event, ...state.lineageEvents],
    }));
  },

  exportReport: (sampleId, format, operator) => {
    const sample = get().getSampleById(sampleId);
    const latestVersion = get().getLatestVersion(sampleId);
    if (!sample || !latestVersion) return;

    const previousExport = get().getSampleExports(sampleId)[0];
    const conclusionBefore = previousExport?.conclusionAfter || sample.latestConclusion || '';
    const conclusionAfter = latestVersion.conclusion;
    const positiveRateBefore = previousExport?.positiveRateAfter || sample.latestPositiveRate;
    const positiveRateAfter = latestVersion.positiveRate;

    const exportRecord: ExportRecord = {
      id: `exp-${Date.now()}`,
      sampleId,
      versionId: latestVersion.id,
      conclusionBefore,
      conclusionAfter,
      positiveRateBefore,
      positiveRateAfter,
      format,
      exportedBy: operator,
      exportedAt: new Date().toISOString(),
      reportTitle: `免疫组化检测报告 - ${sample.barcode}`,
    };

    set((state) => ({
      exportRecords: [...state.exportRecords, exportRecord],
      samples: state.samples.map((s) =>
        s.id === sampleId
          ? { ...s, status: 'exported' as SampleStatus, updatedAt: new Date().toISOString() }
          : s
      ),
    }));

    get().addLineageEvent(
      sampleId,
      'exported',
      `报告已导出（${format.toUpperCase()}格式）`,
      operator,
      { conclusion: conclusionBefore },
      { conclusion: conclusionAfter }
    );
  },

  completeAnomalyStep: (anomalyId, stepNumber, result, operator) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) => {
        if (a.id !== anomalyId) return a;
        return {
          ...a,
          status: 'processing' as const,
          steps: a.steps.map((step) =>
            step.stepNumber === stepNumber
              ? {
                  ...step,
                  status: 'completed' as const,
                  result,
                  operator,
                  completedAt: new Date().toISOString(),
                }
              : step.stepNumber === stepNumber + 1
              ? { ...step, status: 'in_progress' as const }
              : step
          ),
        };
      }),
    }));
  },

  resolveAnomaly: (anomalyId, finalConclusion, operator) => {
    const anomaly = get().anomalies.find((a) => a.id === anomalyId);
    if (!anomaly) return;

    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === anomalyId
          ? {
              ...a,
              status: 'resolved' as const,
              resolvedAt: new Date().toISOString(),
              resolvedBy: operator,
              finalConclusion,
              steps: a.steps.map((step) => ({
                ...step,
                status: step.status === 'pending' ? ('completed' as const) : step.status,
                completedAt: step.completedAt || new Date().toISOString(),
                operator: step.operator || operator,
              })),
            }
          : a
      ),
      samples: state.samples.map((s) =>
        anomaly.sampleIds.includes(s.id)
          ? { ...s, status: 'confirmed' as SampleStatus, hasAnomaly: false }
          : s
      ),
    }));
  },

  getDashboardStats: () => {
    const state = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = state.samples.filter(
      (s) =>
        (s.status === 'confirmed' || s.status === 'exported') &&
        new Date(s.updatedAt) >= today
    ).length;

    const pendingEstimation = state.samples.filter(
      (s) => s.status === 'pending' || s.status === 'estimating'
    ).length;

    const anomalies = state.anomalies.filter((a) => a.status !== 'resolved').length;

    return {
      totalSamples: state.samples.length,
      pendingEstimation,
      anomalies,
      completedToday,
    };
  },
}));

function getStatusLabel(status: SampleStatus): string {
  const map: Record<SampleStatus, string> = {
    pending: '待估算',
    estimating: '估算中',
    estimated: '已估算',
    corrected: '已修正',
    confirmed: '已确认',
    exported: '已导出',
    anomaly: '异常',
  };
  return map[status] || status;
}
