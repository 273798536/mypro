import { create } from 'zustand'
import type {
  AttributionRecord,
  ParameterVersion,
  MaterialChange,
  ManualOverride,
  AnomalyPoint,
  RecordStatus,
  BlockPointType,
  AnomalyLevel,
  MaterialType,
} from '@/types'
import {
  mockRecords,
  mockParameterVersions,
  mockMaterialChanges,
  mockManualOverrides,
  mockAnomalyPoints,
} from '@/mockData'

type FilterBlockPoint = BlockPointType | 'all'

interface FilterState {
  status: RecordStatus | 'all'
  blockPoint: FilterBlockPoint
  anomalyLevel: AnomalyLevel | 'all'
}

interface AddMaterialInput {
  recordId: string
  materialType: MaterialType
  content: string
  isCaliberChanged: boolean
  caliberChangeNote?: string
}

interface StoreState {
  records: AttributionRecord[]
  parameterVersions: ParameterVersion[]
  materialChanges: MaterialChange[]
  manualOverrides: ManualOverride[]
  anomalyPoints: AnomalyPoint[]
  filters: FilterState
  isRunning: boolean
  lastRunAt: string | null
  attributionLogs: string[]

  setFilter: (key: keyof FilterState, value: string) => void
  resetFilters: () => void
  runAttribution: () => Promise<void>
  addManualOverride: (override: Omit<ManualOverride, 'id' | 'createdAt'>) => void
  addMaterialChange: (input: AddMaterialInput) => void
  clearAllData: () => void
}

const defaultFilters: FilterState = {
  status: 'all',
  blockPoint: 'all',
  anomalyLevel: 'all',
}

const STORAGE_KEY = 'heat-pump-attribution-v1'

function loadPersisted(): Partial<StoreState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      records: parsed.records,
      parameterVersions: parsed.parameterVersions,
      materialChanges: parsed.materialChanges,
      manualOverrides: parsed.manualOverrides,
      anomalyPoints: parsed.anomalyPoints,
      lastRunAt: parsed.lastRunAt,
      attributionLogs: parsed.attributionLogs ?? [],
    }
  } catch {
    return null
  }
}

function persist(state: Partial<StoreState>) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        records: state.records,
        parameterVersions: state.parameterVersions,
        materialChanges: state.materialChanges,
        manualOverrides: state.manualOverrides,
        anomalyPoints: state.anomalyPoints,
        lastRunAt: state.lastRunAt,
        attributionLogs: state.attributionLogs,
      }),
    )
  } catch {
    // ignore
  }
}

function computeDeviation(measured: number, expected: number): number {
  if (expected === 0) return 0
  return Number((((measured - expected) / expected) * 100).toFixed(2))
}

function computeAnomalyLevel(deviation: number): AnomalyLevel {
  const abs = Math.abs(deviation)
  if (abs >= 20) return 'high'
  if (abs >= 8) return 'medium'
  return 'low'
}

function computeIsExtreme(deviation: number): boolean {
  return Math.abs(deviation) >= 20
}

function detectBlockPointFromMaterials(materials: MaterialChange[]): {
  hasGap: boolean
  blockPoint?: BlockPointType
  blockNote?: string
} {
  let hasGap = false
  let blockPoint: BlockPointType | undefined
  let blockNote: string | undefined

  for (const m of materials) {
    const content = m.content
    if (content.includes('采样') || content.includes('缺失') || content.includes('堵塞')) {
      hasGap = true
    }
    if (content.includes('公式') || content.includes('缺少') || content.includes('无法计算')) {
      blockPoint = 'formula'
      blockNote = blockNote || m.content
    }
    if (content.includes('单位') || content.includes('换算')) {
      blockPoint = 'unit'
      blockNote = blockNote || m.content
    }
    if (content.includes('阈值') || content.includes('超过阈值') || content.includes('未覆盖')) {
      blockPoint = 'threshold'
      blockNote = blockNote || m.content
    }
  }

  return { hasGap, blockPoint, blockNote }
}

function buildConclusion(
  record: AttributionRecord,
): string {
  if (record.status === 'manual_override') {
    return record.conclusion
  }
  if (record.hasSamplingGap) {
    return '存在采样缺口，暂无法完成归因，需补录数据后重新计算'
  }
  if (record.blockPoint) {
    const label = record.blockPoint === 'formula' ? '公式' : record.blockPoint === 'unit' ? '单位' : '阈值'
    return `归因卡在${label}缺失，待补材料后重算`
  }
  if (record.isExtreme) {
    return `${record.cycleName}偏差 ${record.deviation > 0 ? '偏高' : '偏低'} ${Math.abs(record.deviation).toFixed(2)}%，需重点复核`
  }
  if (Math.abs(record.deviation) >= 8) {
    return `${record.cycleName}偏差 ${record.deviation.toFixed(2)}%，建议关注`
  }
  return `${record.cycleName}偏差 ${record.deviation.toFixed(2)}%，属正常范围`
}

export const useStore = create<StoreState>((set, get) => {
  const persisted = loadPersisted()

  return {
    records: persisted?.records ?? mockRecords,
    parameterVersions: persisted?.parameterVersions ?? mockParameterVersions,
    materialChanges: persisted?.materialChanges ?? mockMaterialChanges,
    manualOverrides: persisted?.manualOverrides ?? mockManualOverrides,
    anomalyPoints: persisted?.anomalyPoints ?? mockAnomalyPoints,
    filters: defaultFilters,
    isRunning: false,
    lastRunAt: persisted?.lastRunAt ?? null,
    attributionLogs: persisted?.attributionLogs ?? [],

    setFilter: (key, value) =>
      set((state) => {
        const next = { filters: { ...state.filters, [key]: value } as FilterState }
        persist({ ...state, ...next })
        return next
      }),

    resetFilters: () =>
      set((state) => {
        persist({ ...state, filters: defaultFilters })
        return { filters: defaultFilters }
      }),

    runAttribution: async () => {
      set({ isRunning: true })
      await new Promise((r) => setTimeout(r, 1200))

      const state = get()
      const logs: string[] = []
      const now = new Date().toISOString()

      const newRecords = state.records.map((record) => {
        const recMaterials = state.materialChanges.filter((m) => m.recordId === record.id)
        const recVersions = state.parameterVersions.filter((v) => v.recordId === record.id)
        const latestVersion = recVersions.sort(
          (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
        )[0]

        const { hasGap, blockPoint, blockNote } = detectBlockPointFromMaterials(recMaterials)

        const param = latestVersion?.parameters ?? {}
        let expected = record.expectedValue
        if (typeof param.expectedValue === 'number') expected = param.expectedValue
        const measured = record.measuredValue
        const deviation = computeDeviation(measured, expected)
        const anomalyLevel = computeAnomalyLevel(deviation)
        const isExtreme = computeIsExtreme(deviation)

        let status: RecordStatus = 'processed'
        if (record.status === 'manual_override') {
          status = 'manual_override'
        } else if (hasGap || blockPoint) {
          status = 'pending_material'
        } else {
          status = 'processed'
        }

        const statusLabel = status === 'processed' ? '已处理' : status === 'pending_material' ? '待补材料' : '人工改判'
        logs.push(
          `[${record.id}] ${record.cycleName}：偏差 ${deviation.toFixed(2)}%，状态 ${statusLabel}${isExtreme ? '，属极端值' : ''}`,
        )

        const nextRecord: AttributionRecord = {
          ...record,
          deviation,
          anomalyLevel,
          isExtreme,
          hasSamplingGap: hasGap,
          blockPoint,
          blockNote: blockNote ?? record.blockNote,
          status,
          parameterVersion: latestVersion?.version ?? record.parameterVersion,
          updatedAt: now,
        }
        nextRecord.conclusion = buildConclusion(nextRecord)
        return nextRecord
      })

      const processedCount = newRecords.filter((r) => r.status === 'processed').length
      const pendingCount = newRecords.filter((r) => r.status === 'pending_material').length
      const extremeCount = newRecords.filter((r) => r.isExtreme).length
      logs.push(`归因完成：${processedCount} 条已处理，${pendingCount} 条待补材料，${extremeCount} 条极端值`)

      const nextState = {
        records: newRecords,
        isRunning: false,
        lastRunAt: now,
        attributionLogs: [...state.attributionLogs.slice(-20), ...logs],
      }
      set(nextState)
      persist({ ...state, ...nextState })
    },

    addManualOverride: (override) =>
      set((state) => {
        const newOverride: ManualOverride = {
          ...override,
          id: `MO${String(state.manualOverrides.length + 1).padStart(3, '0')}`,
          createdAt: new Date().toISOString(),
        }
        const updatedRecords = state.records.map((r) =>
          r.id === override.recordId
            ? { ...r, status: 'manual_override' as const, updatedAt: new Date().toISOString() }
            : r,
        )
        const next = {
          manualOverrides: [...state.manualOverrides, newOverride],
          records: updatedRecords,
        }
        persist({ ...state, ...next })
        return next
      }),

    addMaterialChange: (input) =>
      set((state) => {
        const newMaterial: MaterialChange = {
          id: `MC${String(state.materialChanges.length + 1).padStart(3, '0')}`,
          recordId: input.recordId,
          materialType: input.materialType,
          content: input.content,
          isCaliberChanged: input.isCaliberChanged,
          caliberChangeNote: input.caliberChangeNote,
          changedAt: new Date().toISOString(),
        }
        const updatedRecords = state.records.map((r) =>
          r.id === input.recordId
            ? { ...r, status: 'pending_material' as const, updatedAt: new Date().toISOString() }
            : r,
        )
        const next = {
          materialChanges: [...state.materialChanges, newMaterial],
          records: updatedRecords,
        }
        persist({ ...state, ...next })
        return next
      }),

    clearAllData: () =>
      set(() => {
        localStorage.removeItem(STORAGE_KEY)
        return {
          records: mockRecords,
          parameterVersions: mockParameterVersions,
          materialChanges: mockMaterialChanges,
          manualOverrides: mockManualOverrides,
          anomalyPoints: mockAnomalyPoints,
          filters: defaultFilters,
          lastRunAt: null,
          attributionLogs: [],
        }
      }),
  }
})
