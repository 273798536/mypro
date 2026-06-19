import { create } from 'zustand'
import type {
  ReviewRecord,
  PredictionSnapshot,
  ManualCorrection,
  SourceMaterial,
  ExceptionQueueItem,
  HistoryEntry,
  ModelVersion,
  GrayComparePoint,
  RiskLevel,
  ReviewStatus,
  OperatorRole,
} from '../types'
import {
  modelVersions as mockModelVersions,
  reviewRecords as mockReviewRecords,
  predictionSnapshots as mockPredictions,
  manualCorrections as mockCorrections,
  sourceMaterials as mockSources,
  exceptionQueue as mockExceptions,
  historyEntries as mockHistory,
} from '../data/mockData'

const riskOrder: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

interface AppState {
  modelVersions: ModelVersion[]
  baselineModelId: string
  candidateModelId: string
  reviewRecords: ReviewRecord[]
  predictions: PredictionSnapshot[]
  manualCorrections: ManualCorrection[]
  sourceMaterials: SourceMaterial[]
  exceptionQueue: ExceptionQueueItem[]
  history: HistoryEntry[]

  selectedRecordId: string | null
  selectedTab: 'chart' | 'detail' | 'history' | 'exceptions'

  setSelectedRecordId: (id: string | null) => void
  setSelectedTab: (tab: 'chart' | 'detail' | 'history' | 'exceptions') => void

  getBaselinePrediction: (recordId: string) => PredictionSnapshot | undefined
  getCandidatePrediction: (recordId: string) => PredictionSnapshot | undefined
  getManualCorrection: (recordId: string) => ManualCorrection | undefined
  getSourceMaterials: (recordId: string) => SourceMaterial[]
  getHistory: (recordId: string) => HistoryEntry[]
  getExceptionFor: (recordId: string) => ExceptionQueueItem | undefined

  buildComparePoints: () => GrayComparePoint[]

  applyManualCorrection: (params: {
    recordId: string
    correctedRiskLevel: RiskLevel
    correctedStatus: ReviewStatus
    reason: string
    followUpNote?: string
    operator: string
    operatorRole: OperatorRole
  }) => void

  resolveException: (params: {
    exceptionId: string
    resolutionNote: string
    operator: string
  }) => void

  suspendRecord: (params: {
    recordId: string
    reason: string
  }) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  modelVersions: mockModelVersions,
  baselineModelId: 'mv-2024-06-01',
  candidateModelId: 'mv-2024-06-15',
  reviewRecords: mockReviewRecords,
  predictions: mockPredictions,
  manualCorrections: mockCorrections,
  sourceMaterials: mockSources,
  exceptionQueue: mockExceptions,
  history: mockHistory,

  selectedRecordId: null,
  selectedTab: 'chart',

  setSelectedRecordId: (id) => set({ selectedRecordId: id }),
  setSelectedTab: (tab) => set({ selectedTab: tab }),

  getBaselinePrediction: (recordId) => {
    const { baselineModelId, predictions } = get()
    return predictions.find(
      (p) => p.reviewRecordId === recordId && p.modelVersionId === baselineModelId
    )
  },

  getCandidatePrediction: (recordId) => {
    const { candidateModelId, predictions } = get()
    return predictions.find(
      (p) => p.reviewRecordId === recordId && p.modelVersionId === candidateModelId
    )
  },

  getManualCorrection: (recordId) => {
    return get().manualCorrections.find((m) => m.reviewRecordId === recordId)
  },

  getSourceMaterials: (recordId) => {
    return get().sourceMaterials.filter((s) => s.reviewRecordId === recordId)
  },

  getHistory: (recordId) => {
    return get()
      .history.filter((h) => h.reviewRecordId === recordId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  },

  getExceptionFor: (recordId) => {
    return get().exceptionQueue.find((e) => e.reviewRecordId === recordId && e.status !== 'resolved')
  },

  buildComparePoints: (): GrayComparePoint[] => {
    const state = get()
    const { reviewRecords, modelVersions, manualCorrections } = state

    return reviewRecords.map((record) => {
      const baseline = state.getBaselinePrediction(record.id)
      const candidate = state.getCandidatePrediction(record.id)
      const manual = state.getManualCorrection(record.id)

      const baselineRisk: RiskLevel = manual
        ? manual.correctedRiskLevel
        : baseline?.predictedRiskLevel ?? 'low'
      const baselineStatus: ReviewStatus = manual
        ? manual.correctedStatus
        : baseline?.predictedStatus ?? 'approved'

      const candidateRisk: RiskLevel = candidate?.predictedRiskLevel ?? 'low'
      const candidateStatus: ReviewStatus = candidate?.predictedStatus ?? 'approved'

      const baselineModel = modelVersions.find((m) => m.id === state.baselineModelId)
      const candidateModel = modelVersions.find((m) => m.id === state.candidateModelId)

      let hasManualOverrideConflict = false
      if (manual && candidate) {
        hasManualOverrideConflict =
          riskOrder[candidate.predictedRiskLevel] !== riskOrder[manual.correctedRiskLevel] ||
          candidate.predictedStatus !== manual.correctedStatus
      }

      return {
        recordId: record.id,
        prTitle: record.prTitle,
        baseline: {
          riskLevel: baselineRisk,
          status: baselineStatus,
          modelVersion: baselineModel?.name ?? 'unknown',
          hasManualCorrection: !!manual,
        },
        candidate: {
          riskLevel: candidateRisk,
          status: candidateStatus,
          modelVersion: candidateModel?.name ?? 'unknown',
          confidence: candidate?.confidence ?? 0,
        },
        diff: {
          riskChanged: riskOrder[baselineRisk] !== riskOrder[candidateRisk],
          statusChanged: baselineStatus !== candidateStatus,
          isSuspended: record.isSuspended,
          hasManualOverrideConflict,
        },
      }
    })
  },

  applyManualCorrection: ({ recordId, correctedRiskLevel, correctedStatus, reason, followUpNote, operator, operatorRole }) => {
    const state = get()
    const existing = state.manualCorrections.find((m) => m.reviewRecordId === recordId)
    const record = state.reviewRecords.find((r) => r.id === recordId)
    if (!record) return

    const newCorrection: ManualCorrection = {
      id: existing?.id ?? `mc-${Date.now()}`,
      reviewRecordId,
      correctedRiskLevel,
      correctedStatus,
      reason,
      followUpNote,
      operator,
      operatorRole,
      correctedAt: new Date().toISOString(),
      modelVersionId: state.candidateModelId,
      overriddenPredictionId: record.latestPredictionId,
    }

    const newCorrections = existing
      ? state.manualCorrections.map((m) => (m.reviewRecordId === recordId ? newCorrection : m))
      : [...state.manualCorrections, newCorrection]

    const beforeSnapshot = {
      status: record.currentStatus,
      riskLevel: record.currentRiskLevel,
      source: existing ? 'manual' : 'model',
    }

    const newHistoryEntry: HistoryEntry = {
      id: `he-${Date.now()}`,
      reviewRecordId: recordId,
      eventType: 'manual_correction',
      operator,
      operatorRole,
      timestamp: new Date().toISOString(),
      beforeSnapshot,
      afterSnapshot: {
        status: correctedStatus,
        riskLevel: correctedRiskLevel,
        source: 'manual',
      },
      note: followUpNote,
    }

    const updatedRecord: ReviewRecord = {
      ...record,
      currentStatus: correctedStatus,
      currentRiskLevel: correctedRiskLevel,
      manualCorrectionId: newCorrection.id,
    }

    set({
      manualCorrections: newCorrections,
      reviewRecords: state.reviewRecords.map((r) => (r.id === recordId ? updatedRecord : r)),
      history: [...state.history, newHistoryEntry],
    })
  },

  resolveException: ({ exceptionId, resolutionNote, operator }) => {
    const state = get()
    const exception = state.exceptionQueue.find((e) => e.id === exceptionId)
    if (!exception) return

    const updatedException: ExceptionQueueItem = {
      ...exception,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: operator,
      resolutionNote,
    }

    const record = state.reviewRecords.find((r) => r.id === exception.reviewRecordId)
    let updatedRecord = record
    let historyEntry: HistoryEntry | null = null

    if (record) {
      const beforeSnapshot = {
        isSuspended: record.isSuspended,
        exceptionStatus: exception.status,
      }
      updatedRecord = {
        ...record,
        isSuspended: false,
        suspendedReason: undefined,
      }
      historyEntry = {
        id: `he-${Date.now()}`,
        reviewRecordId: record.id,
        eventType: 'resolve_exception',
        operator,
        operatorRole: 'algorithm',
        timestamp: new Date().toISOString(),
        beforeSnapshot,
        afterSnapshot: {
          isSuspended: false,
          exceptionStatus: 'resolved',
        },
        note: resolutionNote,
      }
    }

    set({
      exceptionQueue: state.exceptionQueue.map((e) => (e.id === exceptionId ? updatedException : e)),
      reviewRecords: updatedRecord
        ? state.reviewRecords.map((r) => (r.id === updatedRecord!.id ? updatedRecord! : r))
        : state.reviewRecords,
      history: historyEntry ? [...state.history, historyEntry] : state.history,
    })
  },

  suspendRecord: ({ recordId, reason }) => {
    const state = get()
    const record = state.reviewRecords.find((r) => r.id === recordId)
    if (!record) return

    const beforeSnapshot = {
      isSuspended: record.isSuspended,
      suspendedReason: record.suspendedReason,
    }

    const historyEntry: HistoryEntry = {
      id: `he-${Date.now()}`,
      reviewRecordId: recordId,
      eventType: 'suspend',
      operator: 'system',
      operatorRole: 'system',
      timestamp: new Date().toISOString(),
      beforeSnapshot,
      afterSnapshot: {
        isSuspended: true,
        suspendedReason: reason,
      },
    }

    const updatedRecord: ReviewRecord = {
      ...record,
      isSuspended: true,
      suspendedReason: reason,
    }

    set({
      reviewRecords: state.reviewRecords.map((r) => (r.id === recordId ? updatedRecord : r)),
      history: [...state.history, historyEntry],
    })
  },
}))
