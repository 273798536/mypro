import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExperimentRecord, ReactionCondition, SpectralPeak, BalanceCalculation, TemperatureCurvePoint, PHCurvePoint, AnomalyEntry, ConclusionGrade, ExportDiff } from '@/types'
import { generateAnomalies, gradeConclusion, calculateCompleteness, detectPeakOverlaps, detectTemperatureExceeds, detectPHExceeds } from '@/utils/analysis'

const rc1: ReactionCondition = {
  id: 'rc-1', recordId: 'rec-1',
  targetTemp: 25, tempUpperLimit: 30, tempLowerLimit: 20,
  targetPH: 5.5, phUpperLimit: 6.0, phLowerLimit: 5.0,
  targetDuration: 120,
}
const rc2: ReactionCondition = {
  id: 'rc-2', recordId: 'rec-2',
  targetTemp: 25, tempUpperLimit: 30, tempLowerLimit: 20,
  targetPH: 5.5, phUpperLimit: 6.5, phLowerLimit: 5.0,
  targetDuration: 120,
}
const rc3: ReactionCondition = {
  id: 'rc-3', recordId: 'rec-3',
  targetTemp: 25, tempUpperLimit: 30, tempLowerLimit: 20,
  targetPH: 5.5, phUpperLimit: 6.0, phLowerLimit: 5.0,
  targetDuration: 120,
}

const sp1: SpectralPeak[] = detectPeakOverlaps([
  { id: 'sp-1-1', recordId: 'rec-1', position: 2.3, intensity: 820, halfWidth: 0.15, element: 'Pb', isOverlapping: false, overlapWith: null },
  { id: 'sp-1-2', recordId: 'rec-1', position: 3.8, intensity: 650, halfWidth: 0.12, element: 'Cd', isOverlapping: false, overlapWith: null },
  { id: 'sp-1-3', recordId: 'rec-1', position: 5.2, intensity: 910, halfWidth: 0.18, element: 'Cr', isOverlapping: false, overlapWith: null },
  { id: 'sp-1-4', recordId: 'rec-1', position: 7.1, intensity: 430, halfWidth: 0.10, element: 'As', isOverlapping: false, overlapWith: null },
])

const sp2: SpectralPeak[] = detectPeakOverlaps([
  { id: 'sp-2-1', recordId: 'rec-2', position: 2.3, intensity: 780, halfWidth: 0.15, element: 'Pb', isOverlapping: false, overlapWith: null },
  { id: 'sp-2-2', recordId: 'rec-2', position: 2.42, intensity: 520, halfWidth: 0.14, element: 'Zn', isOverlapping: false, overlapWith: null },
  { id: 'sp-2-3', recordId: 'rec-2', position: 5.2, intensity: 890, halfWidth: 0.18, element: 'Cr', isOverlapping: false, overlapWith: null },
  { id: 'sp-2-4', recordId: 'rec-2', position: 7.1, intensity: 410, halfWidth: 0.10, element: 'As', isOverlapping: false, overlapWith: null },
])

const sp3: SpectralPeak[] = detectPeakOverlaps([
  { id: 'sp-3-1', recordId: 'rec-3', position: 2.3, intensity: 200, halfWidth: 0.20, element: 'Pb', isOverlapping: false, overlapWith: null },
  { id: 'sp-3-2', recordId: 'rec-3', position: 3.8, intensity: 150, halfWidth: 0.25, element: 'Cd', isOverlapping: false, overlapWith: null },
])

const tc1: TemperatureCurvePoint[] = detectTemperatureExceeds(
  [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map((t) => ({ timePoint: t, temperature: 24.5 + Math.sin(t / 30) * 1.5 })),
  rc1.tempUpperLimit, rc1.tempLowerLimit,
).map((p, i) => ({ ...p, id: `tc-1-${i}`, recordId: 'rec-1' }))

const tc2: TemperatureCurvePoint[] = detectTemperatureExceeds(
  [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map((t) => ({ timePoint: t, temperature: 24 + Math.sin(t / 30) * 2 })),
  rc2.tempUpperLimit, rc2.tempLowerLimit,
).map((p, i) => ({ ...p, id: `tc-2-${i}`, recordId: 'rec-2' }))

const tc3: TemperatureCurvePoint[] = detectTemperatureExceeds(
  [0, 15, 30, 45].map((t) => ({ timePoint: t, temperature: 22 + Math.random() * 12 })),
  rc3.tempUpperLimit, rc3.tempLowerLimit,
).map((p, i) => ({ ...p, id: `tc-3-${i}`, recordId: 'rec-3' }))

const pc1: PHCurvePoint[] = detectPHExceeds(
  [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map((t) => ({ timePoint: t, ph: 5.4 + Math.sin(t / 40) * 0.3 })),
  rc1.phUpperLimit, rc1.phLowerLimit,
).map((p, i) => ({ ...p, id: `pc-1-${i}`, recordId: 'rec-1' }))

const pc2: PHCurvePoint[] = detectPHExceeds(
  [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map((t) => ({ timePoint: t, ph: 5.8 + Math.sin(t / 25) * 0.8 })),
  rc2.phUpperLimit, rc2.phLowerLimit,
).map((p, i) => ({ ...p, id: `pc-2-${i}`, recordId: 'rec-2' }))

const pc3: PHCurvePoint[] = detectPHExceeds(
  [0, 15, 30, 45].map((t) => ({ timePoint: t, ph: 5.2 + Math.random() * 1.5 })),
  rc3.phUpperLimit, rc3.phLowerLimit,
).map((p, i) => ({ ...p, id: `pc-3-${i}`, recordId: 'rec-3' }))

const bc1: BalanceCalculation = { id: 'bc-1', recordId: 'rec-1', extractVolume: 50, sampleMass: 2.5, dilutionFactor: 10, nominalConcentration: 0.5, calculatedConcentration: 0.5, balanceDeviation: 0.0, isDeviationAcceptable: true }
const bc2: BalanceCalculation = { id: 'bc-2', recordId: 'rec-2', extractVolume: 50, sampleMass: 2.5, dilutionFactor: 10, nominalConcentration: 0.5, calculatedConcentration: 0.54, balanceDeviation: 8.0, isDeviationAcceptable: false }
const bc3: BalanceCalculation = { id: 'bc-3', recordId: 'rec-3', extractVolume: null, sampleMass: null, dilutionFactor: null, nominalConcentration: null, calculatedConcentration: null, balanceDeviation: 23.0, isDeviationAcceptable: false }

function buildRecord(
  id: string, sampleCode: string, extractionMethod: string | null, temperature: number | null,
  ph: number | null, duration: number | null, operator: string | null, notes: string | null,
  rc: ReactionCondition, sp: SpectralPeak[], bc: BalanceCalculation,
  tc: TemperatureCurvePoint[], pc: PHCurvePoint[],
): ExperimentRecord {
  const base: ExperimentRecord = {
    id, sampleCode, extractionMethod, temperature, ph, duration, operator, notes,
    status: 'review',
    createdAt: new Date('2026-06-08T09:00:00').toISOString(),
    updatedAt: new Date('2026-06-08T17:30:00').toISOString(),
    reactionCondition: rc, spectralPeaks: sp, balanceCalculation: bc,
    anomalies: [], temperatureCurve: tc, phCurve: pc,
    completenessScore: 0,
  }
  base.anomalies = generateAnomalies(base)
  base.status = gradeConclusion(base)
  base.completenessScore = calculateCompleteness(base)
  return base
}

const sampleRecords: ExperimentRecord[] = [
  buildRecord('rec-1', 'S-2026-001', 'TCLP', 25.0, 5.5, 120, '张明', null, rc1, sp1, bc1, tc1, pc1),
  buildRecord('rec-2', 'S-2026-002', 'TCLP', 25.0, 6.8, 120, '李芳', 'pH偏高需确认', rc2, sp2, bc2, tc2, pc2),
  buildRecord('rec-3', 'S-2026-003', null, null, null, null, null, '仪器故障 可能不准 浓度0.23ppm', rc3, sp3, bc3, tc3, pc3),
]

interface StoreState {
  records: ExperimentRecord[]
  addRecord: (record: ExperimentRecord) => void
  updateRecord: (id: string, updates: Partial<ExperimentRecord>) => void
  deleteRecord: (id: string) => void
  getRecord: (id: string) => ExperimentRecord | undefined
  recalculate: (id: string) => void
  getExportDiffs: (id: string) => ExportDiff[]
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      records: sampleRecords,

      addRecord: (record) => set((s) => ({ records: [...s.records, record] })),

      updateRecord: (id, updates) => set((s) => ({
        records: s.records.map((r) => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r),
      })),

      deleteRecord: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),

      getRecord: (id) => get().records.find((r) => r.id === id),

      recalculate: (id) => set((s) => ({
        records: s.records.map((r) => {
          if (r.id !== id) return r
          const updated = { ...r }
          updated.completenessScore = calculateCompleteness(updated)
          updated.anomalies = generateAnomalies(updated)
          updated.status = gradeConclusion(updated)
          updated.updatedAt = new Date().toISOString()
          return updated
        }),
      })),

      getExportDiffs: (id) => {
        const record = get().records.find((r) => r.id === id)
        if (!record) return []
        const diffs: ExportDiff[] = []
        if (record.temperature !== null && record.reactionCondition) {
          const inRange = record.temperature >= record.reactionCondition.tempLowerLimit && record.temperature <= record.reactionCondition.tempUpperLimit
          diffs.push({
            field: '温度',
            recordedValue: `${record.temperature}℃`,
            calculatedValue: `范围 ${record.reactionCondition.tempLowerLimit}-${record.reactionCondition.tempUpperLimit}℃`,
            isMatch: inRange,
          })
        }
        if (record.ph !== null && record.reactionCondition) {
          const inRange = record.ph >= record.reactionCondition.phLowerLimit && record.ph <= record.reactionCondition.phUpperLimit
          diffs.push({
            field: 'pH',
            recordedValue: `${record.ph}`,
            calculatedValue: `范围 ${record.reactionCondition.phLowerLimit}-${record.reactionCondition.phUpperLimit}`,
            isMatch: inRange,
          })
        }
        if (record.balanceCalculation.calculatedConcentration !== null && record.balanceCalculation.nominalConcentration !== null) {
          const match = (record.balanceCalculation.balanceDeviation ?? 100) <= 5
          diffs.push({
            field: '配平浓度',
            recordedValue: `${record.balanceCalculation.nominalConcentration}`,
            calculatedValue: `${record.balanceCalculation.calculatedConcentration}`,
            isMatch: match,
          })
        }
        diffs.push({
          field: '完整性',
          recordedValue: `${record.completenessScore}%`,
          calculatedValue: record.completenessScore === 100 ? '完整' : '不完整',
          isMatch: record.completenessScore === 100,
        })
        return diffs
      },
    }),
    { name: 'soil-heavy-metal-report' },
  ),
)
