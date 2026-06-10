import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ExperimentRecord,
  SpectralData,
  SafetyNote,
  TemperatureCurve,
  ConcentrationRecord,
  BalanceResult,
  TraceLog,
  RecordStatus,
} from '@/types'
import {
  mockRecords,
  mockSpectralData,
  mockSafetyNotes,
  mockTemperatureCurves,
  mockConcentrationRecords,
  mockBalanceResults,
  mockTraceLogs,
} from '@/data/mockData'

export interface RecordSummary {
  record: ExperimentRecord
  spectralData: SpectralData[]
  safetyNotes: SafetyNote[]
  temperatureCurves: TemperatureCurve[]
  concentrationRecords: ConcentrationRecord[]
  balanceResults: BalanceResult[]
  traceLogs: TraceLog[]
}

type ImportPayload = {
  records?: ExperimentRecord[]
  spectralData?: SpectralData[]
  safetyNotes?: SafetyNote[]
  temperatureCurves?: TemperatureCurve[]
  concentrationRecords?: ConcentrationRecord[]
  balanceResults?: BalanceResult[]
  traceLogs?: TraceLog[]
}

interface LabActions {
  addRecord: (record: ExperimentRecord) => void
  updateRecordStatus: (id: string, status: RecordStatus) => void
  addSafetyNote: (note: SafetyNote) => void
  addSpectralData: (data: SpectralData) => void
  addTemperatureCurve: (curve: TemperatureCurve) => void
  addConcentrationRecord: (record: ConcentrationRecord) => void
  addBalanceResult: (result: BalanceResult) => void
  addTraceLog: (log: TraceLog) => void
  importData: (data: ImportPayload) => void
  getRecordTrace: (recordId: string) => TraceLog[]
  exportRecordSummary: (recordId: string) => RecordSummary | null
  exportAllSummary: () => RecordSummary[]
}

type LabState = {
  records: ExperimentRecord[]
  spectralData: SpectralData[]
  safetyNotes: SafetyNote[]
  temperatureCurves: TemperatureCurve[]
  concentrationRecords: ConcentrationRecord[]
  balanceResults: BalanceResult[]
  traceLogs: TraceLog[]
} & LabActions

function dedupById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const existingIds = new Set(existing.map((item) => item.id))
  return incoming.filter((item) => !existingIds.has(item.id))
}

function nowISO(): string {
  return new Date().toISOString()
}

export const useLabStore = create<LabState>()(
  persist(
    (set, get) => ({
      records: [...mockRecords],
      spectralData: [...mockSpectralData],
      safetyNotes: [...mockSafetyNotes],
      temperatureCurves: [...mockTemperatureCurves],
      concentrationRecords: [...mockConcentrationRecords],
      balanceResults: [...mockBalanceResults],
      traceLogs: [...mockTraceLogs],

      addRecord: (record) => {
        const log: TraceLog = {
          id: `trace-${Date.now()}`,
          recordId: record.id,
          action: '创建实验记录',
          operator: '当前用户',
          detail: `新建实验记录：${record.name}`,
          timestamp: nowISO(),
        }
        set((state) => ({
          records: [...state.records, record],
          traceLogs: [...state.traceLogs, log],
        }))
      },

      updateRecordStatus: (id, status) => {
        const record = get().records.find((r) => r.id === id)
        if (!record) return
        const log: TraceLog = {
          id: `trace-${Date.now()}`,
          recordId: id,
          action: '更新实验状态',
          operator: '当前用户',
          detail: `状态变更为：${status}`,
          timestamp: nowISO(),
        }
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, status, updatedAt: nowISO() } : r
          ),
          traceLogs: [...state.traceLogs, log],
        }))
      },

      addSafetyNote: (note) => {
        const log: TraceLog = {
          id: `trace-${Date.now()}`,
          recordId: note.recordId,
          action: '添加安全提示',
          operator: note.author,
          detail: `添加${note.level}级别安全提示`,
          timestamp: nowISO(),
        }
        set((state) => ({
          safetyNotes: [...state.safetyNotes, note],
          traceLogs: [...state.traceLogs, log],
        }))
      },

      addSpectralData: (data) => {
        const exists = get().spectralData.some(
          (s) => s.recordId === data.recordId && s.id === data.id
        )
        if (exists) return
        set((state) => ({
          spectralData: [...state.spectralData, data],
        }))
      },

      addTemperatureCurve: (curve) => {
        const exists = get().temperatureCurves.some(
          (t) => t.recordId === curve.recordId && t.id === curve.id
        )
        if (exists) return
        set((state) => ({
          temperatureCurves: [...state.temperatureCurves, curve],
        }))
      },

      addConcentrationRecord: (record) => {
        set((state) => ({
          concentrationRecords: [...state.concentrationRecords, record],
        }))
      },

      addBalanceResult: (result) => {
        set((state) => ({
          balanceResults: [...state.balanceResults, result],
        }))
      },

      addTraceLog: (log) => {
        set((state) => ({
          traceLogs: [...state.traceLogs, log],
        }))
      },

      importData: (data) => {
        set((state) => {
          const newRecords = data.records ? dedupById(state.records, data.records) : []
          const newSpectral = data.spectralData ? dedupById(state.spectralData, data.spectralData) : []
          const newNotes = data.safetyNotes ? dedupById(state.safetyNotes, data.safetyNotes) : []
          const newTemp = data.temperatureCurves ? dedupById(state.temperatureCurves, data.temperatureCurves) : []
          const newConc = data.concentrationRecords ? dedupById(state.concentrationRecords, data.concentrationRecords) : []
          const newBal = data.balanceResults ? dedupById(state.balanceResults, data.balanceResults) : []
          const newTraces = data.traceLogs ? dedupById(state.traceLogs, data.traceLogs) : []

          const importLog: TraceLog = {
            id: `trace-${Date.now()}`,
            recordId: 'system',
            action: '导入数据',
            operator: '当前用户',
            detail: `导入记录${newRecords.length}条、谱图${newSpectral.length}条、安全提示${newNotes.length}条、温度曲线${newTemp.length}条、浓度数据${newConc.length}条、配平结果${newBal.length}条、操作日志${newTraces.length}条`,
            timestamp: nowISO(),
          }

          return {
            records: [...state.records, ...newRecords],
            spectralData: [...state.spectralData, ...newSpectral],
            safetyNotes: [...state.safetyNotes, ...newNotes],
            temperatureCurves: [...state.temperatureCurves, ...newTemp],
            concentrationRecords: [...state.concentrationRecords, ...newConc],
            balanceResults: [...state.balanceResults, ...newBal],
            traceLogs: [...state.traceLogs, ...newTraces, importLog],
          }
        })
      },

      getRecordTrace: (recordId) => {
        return get()
          .traceLogs.filter((log) => log.recordId === recordId)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      },

      exportRecordSummary: (recordId) => {
        const state = get()
        const record = state.records.find((r) => r.id === recordId)
        if (!record) return null
        return {
          record,
          spectralData: state.spectralData.filter((s) => s.recordId === recordId),
          safetyNotes: state.safetyNotes.filter((n) => n.recordId === recordId),
          temperatureCurves: state.temperatureCurves.filter((t) => t.recordId === recordId),
          concentrationRecords: state.concentrationRecords.filter((c) => c.recordId === recordId),
          balanceResults: state.balanceResults.filter((b) => b.recordId === recordId),
          traceLogs: state.traceLogs
            .filter((l) => l.recordId === recordId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        }
      },

      exportAllSummary: () => {
        const state = get()
        return state.records.map((record) => ({
          record,
          spectralData: state.spectralData.filter((s) => s.recordId === record.id),
          safetyNotes: state.safetyNotes.filter((n) => n.recordId === record.id),
          temperatureCurves: state.temperatureCurves.filter((t) => t.recordId === record.id),
          concentrationRecords: state.concentrationRecords.filter((c) => c.recordId === record.id),
          balanceResults: state.balanceResults.filter((b) => b.recordId === record.id),
          traceLogs: state.traceLogs
            .filter((l) => l.recordId === record.id)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        }))
      },
    }),
    {
      name: 'lab-safety-store',
    }
  )
)
