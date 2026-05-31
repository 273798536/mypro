import { create } from 'zustand'

const uid = () => Math.random().toString(36).slice(2, 10)

type Unit = {
  id: string
  name: string
  symbol: string
  dimension: string
}

type Instrument = {
  id: string
  name: string
  unitId: string
  precision: number
  precisionType: 'absolute' | 'relative'
}

type Variable = {
  id: string
  symbol: string
  name: string
  unitId: string
  defaultValue: number
  currentValue: number
  uncertainty: number
}

type Formula = {
  id: string
  expression: string
  resultVariableId: string
}

type Measurement = {
  id: string
  variableId: string
  instrumentId: string
  values: number[]
  rowIndex: number
}

type PropagationStep = {
  variableId: string
  variableSymbol: string
  partialDerivative: string
  partialValue: number
  contribution: number
  percentage: number
}

type ErrorPropagation = {
  formulaId: string
  combinedUncertainty: number
  steps: PropagationStep[]
}

type ConflictEntry = {
  id: string
  nodeType: 'add' | 'subtract' | 'assignment'
  leftUnit: string
  rightUnit: string
  sourceVariableId: string
  sourceRow: number
  suggestion: string
}

type UnitCheckResult = {
  formulaId: string
  passed: boolean
  conflicts: ConflictEntry[]
}

type Snapshot = {
  timestamp: number
  variableValues: Record<string, number>
  label: string
}

type ExperimentTemplate = {
  id: string
  name: string
  description: string
  variables: Variable[]
  formulas: Formula[]
  instruments: Instrument[]
}

interface StoreState {
  templates: ExperimentTemplate[]
  currentTemplateId: string | null
  variables: Variable[]
  formulas: Formula[]
  instruments: Instrument[]
  measurements: Measurement[]
  errorPropagation: ErrorPropagation | null
  unitCheckResult: UnitCheckResult | null
  snapshots: Snapshot[]
  currentSnapshotIndex: number
  isPlaying: boolean
}

interface StoreActions {
  loadTemplate: (templateId: string, templates: ExperimentTemplate[]) => void
  setVariableValue: (variableId: string, value: number) => void
  setVariableUncertainty: (variableId: string, uncertainty: number) => void
  setMeasurementValues: (measurementId: string, values: number[]) => void
  addMeasurement: (variableId: string, instrumentId: string) => void
  removeMeasurement: (measurementId: string) => void
  setErrorPropagation: (result: ErrorPropagation | null) => void
  setUnitCheckResult: (result: UnitCheckResult | null) => void
  addSnapshot: (label?: string) => void
  goToSnapshot: (index: number) => void
  togglePlayback: () => void
  setCurrentSnapshotIndex: (index: number) => void
  computeFromMeasurements: () => void
}

export type { Unit, Instrument, Variable, Formula, Measurement, PropagationStep, ErrorPropagation, ConflictEntry, UnitCheckResult, Snapshot, ExperimentTemplate }

export const useStore = create<StoreState & StoreActions>()((set, get) => ({
  templates: [],
  currentTemplateId: null,
  variables: [],
  formulas: [],
  instruments: [],
  measurements: [],
  errorPropagation: null,
  unitCheckResult: null,
  snapshots: [],
  currentSnapshotIndex: 0,
  isPlaying: false,

  loadTemplate: (templateId, templates) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return
    set({
      currentTemplateId: templateId,
      templates,
      variables: template.variables.map(v => ({ ...v, currentValue: v.defaultValue })),
      formulas: [...template.formulas],
      instruments: [...template.instruments],
      measurements: [],
      errorPropagation: null,
      unitCheckResult: null,
    })
  },

  setVariableValue: (variableId, value) => {
    set(state => ({
      variables: state.variables.map(v =>
        v.id === variableId ? { ...v, currentValue: value } : v
      ),
    }))
  },

  setVariableUncertainty: (variableId, uncertainty) => {
    set(state => ({
      variables: state.variables.map(v =>
        v.id === variableId ? { ...v, uncertainty } : v
      ),
    }))
  },

  setMeasurementValues: (measurementId, values) => {
    set(state => ({
      measurements: state.measurements.map(m =>
        m.id === measurementId ? { ...m, values } : m
      ),
    }))
  },

  addMeasurement: (variableId, instrumentId) => {
    set(state => {
      const existing = state.measurements.filter(m => m.variableId === variableId)
      const rowIndex = existing.length
      return {
        measurements: [
          ...state.measurements,
          { id: uid(), variableId, instrumentId, values: [], rowIndex },
        ],
      }
    })
  },

  removeMeasurement: (measurementId) => {
    set(state => ({
      measurements: state.measurements
        .filter(m => m.id !== measurementId)
        .map((m, i) => m.variableId === state.measurements.find(rm => rm.id === measurementId)?.variableId
          ? { ...m, rowIndex: i }
          : m
        ),
    }))
  },

  setErrorPropagation: (result) => {
    set({ errorPropagation: result })
  },

  setUnitCheckResult: (result) => {
    set({ unitCheckResult: result })
  },

  addSnapshot: (label) => {
    const state = get()
    const variableValues: Record<string, number> = {}
    for (const v of state.variables) {
      variableValues[v.id] = v.currentValue
    }
    set({
      snapshots: [
        ...state.snapshots,
        { timestamp: Date.now(), variableValues, label: label ?? `Snapshot ${state.snapshots.length + 1}` },
      ],
      currentSnapshotIndex: state.snapshots.length,
    })
  },

  goToSnapshot: (index) => {
    const state = get()
    const snapshot = state.snapshots[index]
    if (!snapshot) return
    set({
      currentSnapshotIndex: index,
      variables: state.variables.map(v => ({
        ...v,
        currentValue: snapshot.variableValues[v.id] ?? v.currentValue,
      })),
    })
  },

  togglePlayback: () => {
    set(state => ({ isPlaying: !state.isPlaying }))
  },

  setCurrentSnapshotIndex: (index) => {
    set({ currentSnapshotIndex: index })
  },

  computeFromMeasurements: () => {
    const state = get()
    const variableUpdates: Record<string, { currentValue: number; uncertainty: number }> = {}
    for (const variable of state.variables) {
      const rows = state.measurements.filter(m => m.variableId === variable.id)
      const allValues = rows.flatMap(m => m.values)
      if (allValues.length === 0) continue
      const avg = allValues.reduce((s, v) => s + v, 0) / allValues.length
      const variance = allValues.length > 1
        ? allValues.reduce((s, v) => s + (v - avg) ** 2, 0) / (allValues.length - 1)
        : 0
      const stdUncertainty = Math.sqrt(variance / allValues.length)
      variableUpdates[variable.id] = { currentValue: avg, uncertainty: stdUncertainty }
    }
    if (Object.keys(variableUpdates).length === 0) return
    set({
      variables: state.variables.map(v =>
        variableUpdates[v.id]
          ? { ...v, ...variableUpdates[v.id] }
          : v
      ),
    })
  },
}))
