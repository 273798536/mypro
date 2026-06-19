import { create } from 'zustand'
import type {
  AppState,
  ReviewRecord,
  HistoryEntry,
  ReviewStatus,
  GrayBreakdown,
  ThresholdConfig,
  StoreActions,
} from '../types'
import { loadState, saveState, genId } from '../storage'
import { buildSeedState } from '../seed'
import { detectDriftFromRecords, buildGrayBreakdown } from '../services/analysis'

type Store = AppState & StoreActions

function getInitialState(): AppState {
  const existing = loadState()
  if (existing && existing.records && existing.records.length > 0) {
    return existing
  }
  const seed = buildSeedState()
  saveState(seed)
  return seed
}

function persist(state: AppState): AppState {
  saveState(state)
  return state
}

type ZustandSet = (
  partial: Store | Partial<Store> | ((state: Store) => Store | Partial<Store>)
) => void
type ZustandGet = () => Store

export const useReviewStore = create<Store>((set: ZustandSet, get: ZustandGet) => ({
  ...getInitialState(),

  init: () => {
    const s = getInitialState()
    set(s)
  },

  resetToSeed: () => {
    const seed = buildSeedState()
    set(persist(seed))
  },

  addHistoryEntry: (recordId: string, entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    set((state: Store) => {
      const records = state.records.map((r: ReviewRecord) => {
        if (r.id !== recordId) return r
        const newEntry: HistoryEntry = {
          ...entry,
          id: genId('h'),
          timestamp: new Date().toISOString(),
        }
        return { ...r, history: [...r.history, newEntry], updatedAt: new Date().toISOString() }
      })
      return persist({ ...state, records })
    })
  },

  updateRecordField: (
    recordId: string,
    field: keyof ReviewRecord,
    newValue: unknown,
    note?: string
  ) => {
    set((state: Store) => {
      const records = state.records.map((r: ReviewRecord) => {
        if (r.id !== recordId) return r
        const oldValue = r[field]
        const historyEntry: HistoryEntry = {
          id: genId('h'),
          timestamp: new Date().toISOString(),
          operator: state.currentUser,
          field: String(field),
          oldValue,
          newValue,
          note,
        }
        const updated = { ...r, [field]: newValue } as ReviewRecord
        return {
          ...updated,
          history: [...r.history, historyEntry],
          updatedAt: new Date().toISOString(),
        }
      })
      return persist({ ...state, records })
    })
  },

  changeRecordStatus: (recordId: string, status: ReviewStatus, note?: string) => {
    const state = get()
    const target = state.records.find((r: ReviewRecord) => r.id === recordId)
    if (!target) return
    get().addHistoryEntry(recordId, {
      operator: state.currentUser,
      field: 'status',
      oldValue: target.status,
      newValue: status,
      note,
    })
    set((s: Store) => {
      const records = s.records.map((r: ReviewRecord) =>
        r.id === recordId
          ? { ...r, status, updatedAt: new Date().toISOString() }
          : r
      )
      return persist({ ...s, records })
    })
  },

  updateNote: (recordId: string, note: string) => {
    get().updateRecordField(recordId, 'currentNote', note, '更新备注')
  },

  attachScreenshot: (recordId: string, url: string) => {
    get().updateRecordField(recordId, 'currentScreenshotUrl', url, '添加截图')
  },

  confirmSuspended: (recordId: string, accept: boolean) => {
    const state = get()
    const target = state.records.find((r: ReviewRecord) => r.id === recordId)
    if (!target) return

    if (accept) {
      get().changeRecordStatus(
        recordId,
        'confirmed',
        '人工确认阈值漂移影响，接受当前指标结果'
      )
    } else {
      get().changeRecordStatus(
        recordId,
        'anomaly',
        '人工判定为异常数据，转入异常记录处理'
      )
    }
  },

  recomputeGrayBreakdown: (
    recordId: string,
    params: { sampleChange: number; thresholdChange: number; manualOverride: number }
  ) => {
    set((state: Store) => {
      const records = state.records.map((r: ReviewRecord) => {
        if (r.id !== recordId) return r
        const breakdown: GrayBreakdown = buildGrayBreakdown({
          ...params,
          baselineMetric: r.baselineMetric,
        })
        const historyEntry: HistoryEntry = {
          id: genId('h'),
          timestamp: new Date().toISOString(),
          operator: state.currentUser,
          field: 'grayBreakdown',
          oldValue: r.grayBreakdown,
          newValue: breakdown,
          note: '重新计算灰度拆解（样本/阈值/人工改判）',
        }
        return {
          ...r,
          grayBreakdown: breakdown,
          finalMetric: r.baselineMetric + breakdown.totalDelta,
          history: [...r.history, historyEntry],
          updatedAt: new Date().toISOString(),
        }
      })
      return persist({ ...state, records })
    })
  },

  addSupplementRecord: (baseRecordId: string, partialNote: string) => {
    set((state: Store) => {
      const base = state.records.find((r: ReviewRecord) => r.id === baseRecordId)
      if (!base) return state

      const drift = detectDriftFromRecords(base.algorithmMetric, base.baselineMetric)
      const newRecord: ReviewRecord = {
        id: genId('rec'),
        recordType: 'supplemented',
        codeReviewId: `${base.codeReviewId}-补`,
        rawRows: base.rawRows,
        algorithmMetric: base.algorithmMetric,
        baselineMetric: base.baselineMetric,
        finalMetric: base.finalMetric,
        status: drift.drifted ? 'suspended' : 'processing',
        thresholdSnapshot: base.thresholdSnapshot,
        grayBreakdown: buildGrayBreakdown({
          sampleChange: 0,
          thresholdChange: 0,
          manualOverride: 0,
          baselineMetric: base.baselineMetric,
        }),
        history: [
          {
            id: genId('h'),
            timestamp: new Date().toISOString(),
            operator: state.currentUser,
            field: 'recordType',
            oldValue: base.recordType,
            newValue: 'supplemented',
            note: `基于 ${base.codeReviewId} 补录：${partialNote}`,
          },
        ],
        currentNote: partialNote,
        assignedTo: state.currentUser,
        apiResponseSnapshot: base.apiResponseSnapshot,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        suspendedReason: drift.drifted
          ? '补录记录检测到指标漂移，自动挂起待确认。'
          : undefined,
      }
      return persist({ ...state, records: [...state.records, newRecord] })
    })
  },

  setCurrentUser: (name: string) => {
    set((state: Store) => persist({ ...state, currentUser: name }))
  },

  updateThreshold: (thresholdId: string, newValue: number) => {
    set((state: Store) => {
      const thresholds: ThresholdConfig[] = state.thresholds.map((t: ThresholdConfig) => {
        if (t.id !== thresholdId) return t
        const updated = {
          ...t,
          currentValue: newValue,
          updatedAt: new Date().toISOString(),
          updatedBy: state.currentUser,
        }
        updated.isDrifted =
          Math.abs(newValue - t.baselineValue) / Math.max(0.0001, Math.abs(t.baselineValue)) >
          t.driftTolerance
        return updated
      })
      return persist({ ...state, thresholds })
    })
  },
}))
