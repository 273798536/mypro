import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  PipeParams,
  PipeParamsNormalized,
  ImportBatch,
  ImportBatchType,
  Correction,
  CalculationSnapshot,
  FieldChange,
  LocalResistanceItem,
  SchemeData,
} from '@/types'
import { normalizeLength, normalizeFlow, computeFull } from '@/engine'

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const defaultParams: PipeParams = {
  designFlow: { value: 0, unit: 'L/s' },
  pipeDiameter: { value: 0, unit: 'mm' },
  pipeLength: { value: 0, unit: 'm' },
  hazenWilliamsC: 130,
  staticHead: { value: 0, unit: 'm' },
  localResistanceCoeffs: [],
  marginFactor: 0.1,
}

function normalizeParams(p: PipeParams): PipeParamsNormalized {
  return {
    designFlow: normalizeFlow(p.designFlow),
    pipeDiameter: normalizeLength(p.pipeDiameter),
    pipeLength: normalizeLength(p.pipeLength),
    hazenWilliamsC: p.hazenWilliamsC,
    staticHead: normalizeLength(p.staticHead),
    localResistanceCoeffs: p.localResistanceCoeffs,
    marginFactor: p.marginFactor,
  }
}

interface PumpStore {
  params: PipeParams
  normalizedParams: PipeParamsNormalized
  importBatches: ImportBatch[]
  corrections: Correction[]
  snapshots: CalculationSnapshot[]
  currentSnapshot: CalculationSnapshot | null
  schemes: SchemeData[]
  activeSchemeId: string | null
  showCorrectionPanel: boolean

  importBatch1: (designFlow: { value: number; unit: string }, pipeDiameter: { value: number; unit: string }, pipeLength?: { value: number; unit: string }, staticHead?: { value: number; unit: string }) => void
  importBatch2: (items: LocalResistanceItem[]) => void
  applyCorrection: (fieldPath: string, fieldLabel: string, oldValue: string, newValue: string, reason: string) => void
  updateParam: <K extends keyof PipeParams>(key: K, value: PipeParams[K]) => void
  recalculate: (triggerType?: 'import' | 'correction' | 'initial') => void
  saveAsScheme: (label: string) => void
  setActiveScheme: (id: string | null) => void
  removeScheme: (id: string) => void
  toggleCorrectionPanel: () => void
  reset: () => void
}

export const usePumpStore = create<PumpStore>()(
  persist(
    (set, get) => ({
  params: { ...defaultParams },
  normalizedParams: normalizeParams(defaultParams),
  importBatches: [],
  corrections: [],
  snapshots: [],
  currentSnapshot: null,
  schemes: [],
  activeSchemeId: null,
  showCorrectionPanel: false,

  importBatch1: (designFlow, pipeDiameter, pipeLength, staticHead) => {
    const state = get()
    const oldParams = { ...state.params }

    const newParams: PipeParams = {
      ...oldParams,
      designFlow: designFlow as PipeParams['designFlow'],
      pipeDiameter: pipeDiameter as PipeParams['pipeDiameter'],
    }
    if (pipeLength) newParams.pipeLength = pipeLength as PipeParams['pipeLength']
    if (staticHead) newParams.staticHead = staticHead as PipeParams['staticHead']

    const changes: FieldChange[] = []
    if (oldParams.designFlow.value !== newParams.designFlow.value) {
      changes.push({ fieldPath: 'designFlow', fieldLabel: '设计流量', oldValue: oldParams.designFlow.value, newValue: newParams.designFlow.value })
    }
    if (oldParams.pipeDiameter.value !== newParams.pipeDiameter.value) {
      changes.push({ fieldPath: 'pipeDiameter', fieldLabel: '管径', oldValue: oldParams.pipeDiameter.value, newValue: newParams.pipeDiameter.value })
    }
    if (pipeLength && oldParams.pipeLength.value !== newParams.pipeLength.value) {
      changes.push({ fieldPath: 'pipeLength', fieldLabel: '管长', oldValue: oldParams.pipeLength.value, newValue: newParams.pipeLength.value })
    }
    if (staticHead && oldParams.staticHead.value !== newParams.staticHead.value) {
      changes.push({ fieldPath: 'staticHead', fieldLabel: '静扬程', oldValue: oldParams.staticHead.value, newValue: newParams.staticHead.value })
    }

    const batch: ImportBatch = {
      id: genId(),
      batchType: 'flow_and_diameter',
      importedAt: new Date().toISOString(),
      rawData: { designFlow, pipeDiameter, pipeLength, staticHead },
      normalizedData: {
        designFlow: normalizeFlow(newParams.designFlow),
        pipeDiameter: normalizeLength(newParams.pipeDiameter),
        ...(pipeLength ? { pipeLength: normalizeLength(newParams.pipeLength) } : {}),
        ...(staticHead ? { staticHead: normalizeLength(newParams.staticHead) } : {}),
      },
      changes,
    }

    const normalized = normalizeParams(newParams)
    const snapshot = computeFull(normalized, 'import')

    set({
      params: newParams,
      normalizedParams: normalized,
      importBatches: [...state.importBatches, batch],
      snapshots: [...state.snapshots, snapshot],
      currentSnapshot: snapshot,
    })
  },

  importBatch2: (items) => {
    const state = get()
    const oldParams = { ...state.params }
    const oldCoeffs = oldParams.localResistanceCoeffs

    const newParams: PipeParams = {
      ...oldParams,
      localResistanceCoeffs: items,
    }

    const changes: FieldChange[] = [{
      fieldPath: 'localResistanceCoeffs',
      fieldLabel: '局部阻力',
      oldValue: `${oldCoeffs.length}项`,
      newValue: `${items.length}项`,
    }]

    const batch: ImportBatch = {
      id: genId(),
      batchType: 'local_resistance',
      importedAt: new Date().toISOString(),
      rawData: { items },
      normalizedData: { localResistanceCoeffs: items },
      changes,
    }

    const normalized = normalizeParams(newParams)
    const snapshot = computeFull(normalized, 'import')

    set({
      params: newParams,
      normalizedParams: normalized,
      importBatches: [...state.importBatches, batch],
      snapshots: [...state.snapshots, snapshot],
      currentSnapshot: snapshot,
    })
  },

  applyCorrection: (fieldPath, fieldLabel, oldValue, newValue, reason) => {
    const state = get()
    const correction: Correction = {
      id: genId(),
      fieldPath,
      fieldLabel,
      oldValue,
      newValue,
      correctedAt: new Date().toISOString(),
      reason,
    }

    const normalized = normalizeParams(state.params)
    const snapshot = computeFull(normalized, 'correction')

    set({
      corrections: [...state.corrections, correction],
      snapshots: [...state.snapshots, snapshot],
      currentSnapshot: snapshot,
    })
  },

  updateParam: (key, value) => {
    const state = get()
    const newParams = { ...state.params, [key]: value }
    const normalized = normalizeParams(newParams)
    set({ params: newParams, normalizedParams: normalized })
  },

  recalculate: (triggerType = 'initial') => {
    const state = get()
    const normalized = normalizeParams(state.params)
    const snapshot = computeFull(normalized, triggerType)
    set({
      normalizedParams: normalized,
      snapshots: [...state.snapshots, snapshot],
      currentSnapshot: snapshot,
    })
  },

  saveAsScheme: (label) => {
    const state = get()
    if (!state.currentSnapshot) return
    const scheme: SchemeData = {
      id: genId(),
      label,
      snapshot: { ...state.currentSnapshot },
      params: { ...state.normalizedParams },
    }
    set({ schemes: [...state.schemes, scheme] })
  },

  setActiveScheme: (id) => set({ activeSchemeId: id }),

  removeScheme: (id) => {
    const state = get()
    set({ schemes: state.schemes.filter(s => s.id !== id), activeSchemeId: state.activeSchemeId === id ? null : state.activeSchemeId })
  },

  toggleCorrectionPanel: () => set(s => ({ showCorrectionPanel: !s.showCorrectionPanel })),

  reset: () => set({
    params: { ...defaultParams },
    normalizedParams: normalizeParams(defaultParams),
    importBatches: [],
    corrections: [],
    snapshots: [],
    currentSnapshot: null,
    schemes: [],
    activeSchemeId: null,
  }),
}),
    {
      name: 'pump-head-selector',
      partialize: (state) => ({
        params: state.params,
        importBatches: state.importBatches,
        corrections: state.corrections,
        snapshots: state.snapshots,
        currentSnapshot: state.currentSnapshot,
        schemes: state.schemes,
      }),
    }
  )
)
