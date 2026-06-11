import type { BuoyRecord, RiskAssessment, AssessmentHistory, DuplicateGroup, PhotoGap } from '@/types'
import { assessRecord } from '@/utils/calcEngine'

interface AppState {
  buoyRecords: BuoyRecord[]
  riskAssessments: RiskAssessment[]
  assessmentHistory: AssessmentHistory[]
  duplicateGroups: DuplicateGroup[]
  photoGaps: PhotoGap[]
  selectedStation: string | null
}

export const initialState: AppState = {
  buoyRecords: [],
  riskAssessments: [],
  assessmentHistory: [],
  duplicateGroups: [],
  photoGaps: [],
  selectedStation: null,
}

const METRIC_KEYS = ['dissolved_oxygen', 'ph', 'turbidity', 'conductivity', 'water_temp', 'chlorophyll_a'] as const

function detectDuplicates(records: BuoyRecord[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []
  const assigned = new Set<string>()
  let groupIdx = 0

  for (let i = 0; i < records.length; i++) {
    if (assigned.has(records[i].id)) continue
    for (let j = i + 1; j < records.length; j++) {
      if (assigned.has(records[j].id)) continue
      const a = records[i]
      const b = records[j]

      if (a.stationId === b.stationId && a.timestamp === b.timestamp) {
        const allSame = METRIC_KEYS.every((k) => {
          const va = a[k as keyof BuoyRecord]
          const vb = b[k as keyof BuoyRecord]
          return va === vb
        })

        if (allSame) {
          const g: DuplicateGroup = {
            id: `DG${String(groupIdx + 1).padStart(3, '0')}`,
            type: 'same_value',
            description: `站点 ${a.stationName} 在 ${a.timestamp} 存在完全相同的重复上报`,
            recordIds: [a.id, b.id],
            resolved: false,
            resolvedAction: null,
            mergedResult: a,
          }
          groups.push(g)
          assigned.add(a.id)
          assigned.add(b.id)
          groupIdx++
          continue
        }

        const anyDiff = METRIC_KEYS.some((k) => {
          const va = a[k as keyof BuoyRecord]
          const vb = b[k as keyof BuoyRecord]
          return va !== vb
        })

        if (anyDiff) {
          const g: DuplicateGroup = {
            id: `DG${String(groupIdx + 1).padStart(3, '0')}`,
            type: 'diff_value',
            description: `站点 ${a.stationName} 在 ${a.timestamp} 存在数值不同的重复上报`,
            recordIds: [a.id, b.id],
            resolved: false,
            resolvedAction: null,
            mergedResult: null,
          }
          groups.push(g)
          assigned.add(a.id)
          assigned.add(b.id)
          groupIdx++
        }
      }
    }
  }

  for (let i = 0; i < records.length; i++) {
    if (assigned.has(records[i].id)) continue
    for (let j = i + 1; j < records.length; j++) {
      if (assigned.has(records[j].id)) continue
      const a = records[i]
      const b = records[j]

      if (a.stationId !== b.stationId && a.timestamp === b.timestamp) {
        const allClose = METRIC_KEYS.every((k) => {
          const va = a[k as keyof BuoyRecord] as number | null
          const vb = b[k as keyof BuoyRecord] as number | null
          if (va === null || vb === null) return true
          const avg = (va + vb) / 2
          return avg === 0 ? va === vb : Math.abs(va - vb) / avg < 0.05
        })

        if (allClose) {
          const g: DuplicateGroup = {
            id: `DG${String(groupIdx + 1).padStart(3, '0')}`,
            type: 'cross_station',
            description: `${a.stationName} 与 ${b.stationName} 在 ${a.timestamp} 数据高度相似，疑似串站`,
            recordIds: [a.id, b.id],
            resolved: false,
            resolvedAction: null,
            mergedResult: null,
          }
          groups.push(g)
          assigned.add(a.id)
          assigned.add(b.id)
          groupIdx++
        }
      }
    }
  }

  return groups
}

function detectPhotoGaps(records: BuoyRecord[]): PhotoGap[] {
  return records
    .filter((r) => !r.hasPhoto)
    .map((r) => ({
      stationId: r.stationId,
      stationName: r.stationName,
      timestamp: r.timestamp,
      missingPhotoType: r.photoType ?? '现场巡检照片',
      recordId: r.id,
      canCompute: true,
    }))
}

function assessAll(records: BuoyRecord[], prevAssessments: RiskAssessment[], prevHistory: AssessmentHistory[]): { assessments: RiskAssessment[]; history: AssessmentHistory[] } {
  const prevMap = new Map(prevAssessments.map((a) => [a.stationId, a] as const))
  const assessments: RiskAssessment[] = []
  const history: AssessmentHistory[] = [...prevHistory]
  let versionCounter = prevHistory.length > 0 ? Math.max(...prevHistory.map((h) => h.currentVersion)) + 1 : 1

  const latestByStation = new Map<string, BuoyRecord>()
  for (const r of records) {
    const existing = latestByStation.get(r.stationId)
    if (!existing || r.timestamp > existing.timestamp) {
      latestByStation.set(r.stationId, r)
    }
  }

  for (const [, record] of latestByStation) {
    const assessment = assessRecord(record)
    const prev = prevMap.get(record.stationId)

    if (prev && prev.level !== assessment.level) {
      history.push({
        id: `AH${String(history.length + 1).padStart(3, '0')}`,
        assessmentId: assessment.id,
        stationId: record.stationId,
        previousLevel: prev.level,
        currentLevel: assessment.level,
        previousVersion: prev.version,
        currentVersion: versionCounter,
        changedAt: new Date().toISOString(),
        changeReason: '数据更新导致风险等级变化',
      })
      assessment.version = versionCounter
      versionCounter++
    } else if (prev) {
      assessment.version = prev.version
    }

    assessments.push(assessment)
  }

  return { assessments, history }
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getSampleData } from '@/data/sampleData'

interface AppActions {
  addBuoyRecords: (records: BuoyRecord[]) => void
  updateBuoyRecord: (id: string, patch: Partial<BuoyRecord>) => void
  resolveDuplicate: (groupId: string, action: string, keepRecordId?: string) => void
  addPhotoToRecord: (recordId: string, photoType: string) => void
  setSelectedStation: (stationId: string | null) => void
  loadSampleData: () => void
  resetData: () => void
}

type AppStore = AppState & AppActions

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addBuoyRecords: (records) => {
        const state = get()
        const newRecords = [...state.buoyRecords, ...records]
        const duplicates = detectDuplicates(newRecords)
        const { assessments, history } = assessAll(newRecords, state.riskAssessments, state.assessmentHistory)
        const gaps = detectPhotoGaps(newRecords)
        set({
          buoyRecords: newRecords,
          duplicateGroups: duplicates,
          riskAssessments: assessments,
          assessmentHistory: history,
          photoGaps: gaps,
        })
      },

      updateBuoyRecord: (id, patch) => {
        const state = get()
        const newRecords = state.buoyRecords.map((r) => (r.id === id ? { ...r, ...patch } : r))
        const { assessments, history } = assessAll(newRecords, state.riskAssessments, state.assessmentHistory)
        const gaps = detectPhotoGaps(newRecords)
        set({
          buoyRecords: newRecords,
          riskAssessments: assessments,
          assessmentHistory: history,
          photoGaps: gaps,
        })
      },

      resolveDuplicate: (groupId, action, keepRecordId) => {
        const state = get()
        const group = state.duplicateGroups.find((g) => g.id === groupId)
        if (!group) return

        let newRecords = [...state.buoyRecords]
        if (action === 'keep_first' && group.recordIds.length >= 2) {
          newRecords = newRecords.filter((r) => r.id !== group.recordIds[1])
        } else if (action === 'keep_second' && group.recordIds.length >= 2) {
          newRecords = newRecords.filter((r) => r.id !== group.recordIds[0])
        } else if (action === 'keep_specified' && keepRecordId) {
          newRecords = newRecords.filter((r) => r.id === keepRecordId || !group.recordIds.includes(r.id))
        }

        const removedIds = group.recordIds.filter((rid) => !newRecords.find((r) => r.id === rid))
        const newGroups = state.duplicateGroups
          .map((g) => {
            if (g.id === groupId) return { ...g, resolved: true, resolvedAction: action }
            const remainingIds = g.recordIds.filter((id) => !removedIds.includes(id))
            if (remainingIds.length < 2) return null
            return { ...g, recordIds: remainingIds }
          })
          .filter((g): g is DuplicateGroup => g !== null)

        const { assessments, history } = assessAll(newRecords, state.riskAssessments, state.assessmentHistory)
        const gaps = detectPhotoGaps(newRecords)

        set({
          buoyRecords: newRecords,
          duplicateGroups: newGroups,
          riskAssessments: assessments,
          assessmentHistory: history,
          photoGaps: gaps,
        })
      },

      addPhotoToRecord: (recordId, photoType) => {
        const state = get()
        const newRecords = state.buoyRecords.map((r) =>
          r.id === recordId ? { ...r, hasPhoto: true, photoType } : r
        )
        const { assessments, history } = assessAll(newRecords, state.riskAssessments, state.assessmentHistory)
        const gaps = detectPhotoGaps(newRecords)
        set({
          buoyRecords: newRecords,
          riskAssessments: assessments,
          assessmentHistory: history,
          photoGaps: gaps,
        })
      },

      setSelectedStation: (stationId) => {
        set({ selectedStation: stationId })
      },

      loadSampleData: () => {
        const { records } = getSampleData()
        const duplicates = detectDuplicates(records)
        const { assessments, history: initHistory } = assessAll(records, [], [])
        const gaps = detectPhotoGaps(records)

        const revisedRecords = records.map((r) =>
          r.id === 'BR010'
            ? {
                ...r,
                dissolved_oxygen: 7.0,
                turbidity: 15.0,
                verified: true,
                verifiedBy: '课题组复核',
                verifiedAt: '2026-06-11T10:00:00',
                verifyNote: '历史复核：DO探头校正后3.5→7.0，浊度受气泡干扰45→15，注意叶绿素a和pH仍异常',
              }
            : r
        )
        const { assessments: revisedAssess, history: revisedHistory } = assessAll(
          revisedRecords,
          assessments,
          initHistory
        )
        const revisedGaps = detectPhotoGaps(revisedRecords)
        const revisedDuplicates = detectDuplicates(revisedRecords)

        set({
          buoyRecords: revisedRecords,
          duplicateGroups: revisedDuplicates,
          riskAssessments: revisedAssess,
          assessmentHistory: revisedHistory,
          photoGaps: revisedGaps,
          selectedStation: null,
        })
      },

      resetData: () => {
        set(initialState)
      },
    }),
    {
      name: 'water-quality-dashboard',
    }
  )
)
