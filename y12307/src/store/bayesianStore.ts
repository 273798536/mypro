import { create } from 'zustand'
import type {
  AlarmRecord,
  MaintenanceResult,
  LocalizationReport,
  ComponentProbability,
  EvidenceItem,
  BoundaryWarning,
  UnitConflict,
  CalibrationConflict,
  ReinspectionSuggestion,
  TraceLink,
  ComponentPrior,
} from '@/types'
import { bayesianUpdate, computeRankChanges } from '@/utils/bayesianEngine'
import { detectBoundaryWarnings } from '@/utils/boundaryDetector'
import { detectAllConflicts } from '@/utils/conflictDetector'
import { generateReinspectionSuggestions } from '@/utils/reinspectionAdvisor'
import { buildTraceLinks } from '@/utils/traceBuilder'
import { checkLabelDelay } from '@/utils/boundaryDetector'
import { convertToBase } from '@/utils/unitConversion'

interface BayesianState {
  alarms: AlarmRecord[]
  maintenances: MaintenanceResult[]
  reports: LocalizationReport[]
  probabilities: ComponentProbability[]
  evidenceChain: EvidenceItem[]
  boundaryWarnings: BoundaryWarning[]
  unitConflicts: UnitConflict[]
  calibrationConflicts: CalibrationConflict[]
  reinspectionSuggestions: ReinspectionSuggestion[]
  traceLinks: TraceLink[]
  priors: ComponentPrior[]

  addAlarm: (alarm: Omit<AlarmRecord, 'id' | 'convertedValue' | 'baseUnit'>) => void
  addMaintenance: (maintenance: Omit<MaintenanceResult, 'id' | 'labelDelayDetected'>) => void
  addReport: (report: Omit<LocalizationReport, 'id' | 'importedAt' | 'unitConflicts' | 'calibrationConflicts'>) => void
  resolveUnitConflict: (conflictId: string) => void
  removeAlarm: (id: string) => void
  removeMaintenance: (id: string) => void
  removeReport: (id: string) => void
  setPriors: (priors: ComponentPrior[]) => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function recalculate(state: Partial<BayesianState>): {
  probabilities: ComponentProbability[]
  evidenceChain: EvidenceItem[]
  boundaryWarnings: BoundaryWarning[]
  reinspectionSuggestions: ReinspectionSuggestion[]
  traceLinks: TraceLink[]
} {
  const alarms = state.alarms ?? []
  const maintenances = state.maintenances ?? []
  const priors = state.priors ?? []
  const prevProbs = state.probabilities ?? []

  const { probabilities: rawProbs, evidenceChain } = bayesianUpdate(priors, alarms, maintenances)
  const probabilities = computeRankChanges(prevProbs, rawProbs)
  const boundaryWarnings = detectBoundaryWarnings(alarms, maintenances, probabilities)
  const reinspectionSuggestions = generateReinspectionSuggestions(probabilities, boundaryWarnings, evidenceChain)
  const traceLinks = buildTraceLinks(alarms, maintenances, probabilities)

  return { probabilities, evidenceChain, boundaryWarnings, reinspectionSuggestions, traceLinks }
}

export const useBayesianStore = create<BayesianState>((set, get) => ({
  alarms: [],
  maintenances: [],
  reports: [],
  probabilities: [],
  evidenceChain: [],
  boundaryWarnings: [],
  unitConflicts: [],
  calibrationConflicts: [],
  reinspectionSuggestions: [],
  traceLinks: [],
  priors: [],

  addAlarm: (alarmInput) => {
    const id = generateId()
    const conversion = convertToBase(alarmInput.rawValue, alarmInput.rawUnit)
    const convertedValue = conversion?.converted ?? alarmInput.rawValue
    const baseUnit = conversion?.baseUnit ?? alarmInput.rawUnit

    const newAlarm: AlarmRecord = { ...alarmInput, id, convertedValue, baseUnit }

    set((state) => {
      const updatedAlarms = [...state.alarms, newAlarm]
      const { unitConflicts } = detectAllConflicts(updatedAlarms, newAlarm, undefined)
      const updated = {
        ...state,
        alarms: updatedAlarms,
        unitConflicts: [...state.unitConflicts, ...unitConflicts],
      }
      const recalced = recalculate(updated)
      return { ...updated, ...recalced }
    })
  },

  addMaintenance: (mInput) => {
    const id = generateId()
    const relatedAlarms = get().alarms.filter(a => mInput.relatedAlarmIds.includes(a.id))
    const latestAlarmTime = relatedAlarms.length > 0
      ? relatedAlarms.reduce((latest, a) => {
          const aTime = new Date(a.timestamp).getTime()
          return aTime > latest ? aTime : latest
        }, 0)
      : 0
    const labelDelayDetected = latestAlarmTime > 0
      ? checkLabelDelay(mInput.timestamp, new Date(latestAlarmTime).toISOString())
      : false

    const newM: MaintenanceResult = { ...mInput, id, labelDelayDetected }

    set((state) => {
      const updatedMaintenances = [...state.maintenances, newM]
      const updated = { ...state, maintenances: updatedMaintenances }
      const recalced = recalculate(updated)
      return { ...updated, ...recalced }
    })
  },

  addReport: (rInput) => {
    const id = generateId()
    const importedAt = new Date().toISOString()

    const report: LocalizationReport = {
      ...rInput,
      id,
      importedAt,
      unitConflicts: [],
      calibrationConflicts: [],
    }

    set((state) => {
      const updatedReports = [...state.reports, report]
      const { calibrationConflicts } = detectAllConflicts(state.alarms, undefined, updatedReports)
      const updated = {
        ...state,
        reports: updatedReports,
        calibrationConflicts: [...state.calibrationConflicts, ...calibrationConflicts],
      }

      const mergedPriors: ComponentPrior[] = [...updated.priors]
      for (const ranking of rInput.componentRanking) {
        const existing = mergedPriors.find(p => p.component === ranking.component)
        if (!existing) {
          mergedPriors.push({
            component: ranking.component,
            prior: ranking.probability * rInput.priorStrength,
            material: ranking.material,
            object: ranking.object,
          })
        }
      }

      const updatedWithPriors = { ...updated, priors: mergedPriors }
      const recalced = recalculate(updatedWithPriors)
      return { ...updatedWithPriors, ...recalced }
    })
  },

  resolveUnitConflict: (conflictId) => {
    set((state) => ({
      unitConflicts: state.unitConflicts.map(c =>
        c.id === conflictId ? { ...c, resolved: true } : c
      ),
    }))
  },

  removeAlarm: (id) => {
    set((state) => {
      const updatedAlarms = state.alarms.filter(a => a.id !== id)
      const updated = { ...state, alarms: updatedAlarms }
      const recalced = recalculate(updated)
      return { ...updated, ...recalced }
    })
  },

  removeMaintenance: (id) => {
    set((state) => {
      const updatedMaintenances = state.maintenances.filter(m => m.id !== id)
      const updated = { ...state, maintenances: updatedMaintenances }
      const recalced = recalculate(updated)
      return { ...updated, ...recalced }
    })
  },

  removeReport: (id) => {
    set((state) => {
      const updatedReports = state.reports.filter(r => r.id !== id)
      const updated = { ...state, reports: updatedReports }
      const recalced = recalculate(updated)
      return { ...updated, ...recalced }
    })
  },

  setPriors: (priors) => {
    set((state) => {
      const updated = { ...state, priors }
      const recalced = recalculate(updated)
      return { ...updated, ...recalced }
    })
  },
}))
