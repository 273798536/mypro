import { create } from 'zustand'
import type {
  PulleyRecord,
  CalculationResult,
  ValidationWarning,
  CorrectionEntry,
  WeightUnit,
  LengthUnit,
} from '../types'
import { calculatePulleySystem } from '../utils/calculations'
import { validatePulleyRecord } from '../utils/validators'
import { sampleRecords } from '../utils/sampleData'

interface PulleyStore {
  records: PulleyRecord[]
  activeRecordId: string | null
  calculationResults: Record<string, CalculationResult>
  warnings: Record<string, ValidationWarning[]>
  corrections: CorrectionEntry[]

  getActiveRecord: () => PulleyRecord | undefined
  getActiveResult: () => CalculationResult | undefined
  getActiveWarnings: () => ValidationWarning[]

  selectRecord: (id: string) => void
  updateParam: <K extends keyof PulleyRecord>(
    id: string,
    field: K,
    value: PulleyRecord[K],
    reason?: string
  ) => void
  addRecord: (record: PulleyRecord) => void
  recalculate: (id: string) => void
}

export const usePulleyStore = create<PulleyStore>((set, get) => {
  const initialResults: Record<string, CalculationResult> = {}
  const initialWarnings: Record<string, ValidationWarning[]> = {}

  sampleRecords.forEach((r) => {
    initialResults[r.id] = calculatePulleySystem(r)
    initialWarnings[r.id] = validatePulleyRecord(r)
  })

  return {
    records: sampleRecords,
    activeRecordId: sampleRecords[0].id,
    calculationResults: initialResults,
    warnings: initialWarnings,
    corrections: [],

    getActiveRecord: () => {
      const state = get()
      return state.records.find((r) => r.id === state.activeRecordId)
    },

    getActiveResult: () => {
      const state = get()
      if (!state.activeRecordId) return undefined
      return state.calculationResults[state.activeRecordId]
    },

    getActiveWarnings: () => {
      const state = get()
      if (!state.activeRecordId) return []
      return state.warnings[state.activeRecordId] || []
    },

    selectRecord: (id: string) => {
      set({ activeRecordId: id })
    },

    updateParam: (id, field, value, reason = '参数调整') => {
      const state = get()
      const record = state.records.find((r) => r.id === id)
      if (!record) return

      const oldValue = String(record[field])
      const newValue = String(value)

      const correction: CorrectionEntry = {
        id: crypto.randomUUID(),
        recordId: id,
        fieldChanged: String(field),
        oldValue,
        newValue,
        reason,
        correctedAt: new Date().toISOString(),
      }

      const updatedRecords = state.records.map((r) =>
        r.id === id
          ? { ...r, [field]: value, updatedAt: new Date().toISOString() }
          : r
      )

      const updatedRecord = updatedRecords.find((r) => r.id === id)!

      const newResult = calculatePulleySystem(updatedRecord)
      const newWarnings = validatePulleyRecord(updatedRecord)

      set({
        records: updatedRecords,
        calculationResults: { ...state.calculationResults, [id]: newResult },
        warnings: { ...state.warnings, [id]: newWarnings },
        corrections: [...state.corrections, correction],
      })
    },

    addRecord: (record: PulleyRecord) => {
      const state = get()
      const result = calculatePulleySystem(record)
      const warns = validatePulleyRecord(record)
      set({
        records: [...state.records, record],
        calculationResults: { ...state.calculationResults, [record.id]: result },
        warnings: { ...state.warnings, [record.id]: warns },
        activeRecordId: record.id,
      })
    },

    recalculate: (id: string) => {
      const state = get()
      const record = state.records.find((r) => r.id === id)
      if (!record) return
      const result = calculatePulleySystem(record)
      const warns = validatePulleyRecord(record)
      set({
        calculationResults: { ...state.calculationResults, [id]: result },
        warnings: { ...state.warnings, [id]: warns },
      })
    },
  }
})
