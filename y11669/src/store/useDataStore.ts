import { create } from 'zustand'
import type { Rack, ACUnit, TemperatureSample, DataCorrection, DataQualityIssue, Alert } from '../types/scene'
import { generateRacks, generateACUnits, generateTemperatureSamples, generateDataCorrections, generateDataQualityIssues, generateAlerts } from '../services/mockData'

interface DataStore {
  racks: Rack[]
  acUnits: ACUnit[]
  temperatureSamples: TemperatureSample[]
  dataCorrections: DataCorrection[]
  dataQualityIssues: DataQualityIssue[]
  alerts: Alert[]
  isLoading: boolean
  error: string | null
  lastUpdate: Date | null
  refreshData: () => void
  addDataCorrection: (correction: Omit<DataCorrection, 'id' | 'correctedAt'>) => void
  updateAlertStatus: (alertId: string, status: Alert['status'], note?: string) => void
}

const initialRacks = generateRacks()
const initialACUnits = generateACUnits()
const initialSamples = generateTemperatureSamples(initialRacks)
const initialAlerts = generateAlerts(initialRacks, initialACUnits)

export const useDataStore = create<DataStore>((set) => ({
  racks: initialRacks,
  acUnits: initialACUnits,
  temperatureSamples: initialSamples,
  dataCorrections: generateDataCorrections(),
  dataQualityIssues: generateDataQualityIssues(initialSamples, initialACUnits),
  alerts: initialAlerts,
  isLoading: false,
  error: null,
  lastUpdate: new Date(),

  refreshData: () => {
    set({ isLoading: true })
    setTimeout(() => {
      const newRacks = generateRacks()
      const newACUnits = generateACUnits()
      const newSamples = generateTemperatureSamples(newRacks)
      set({
        racks: newRacks,
        acUnits: newACUnits,
        temperatureSamples: newSamples,
        alerts: generateAlerts(newRacks, newACUnits),
        dataQualityIssues: generateDataQualityIssues(newSamples, newACUnits),
        isLoading: false,
        lastUpdate: new Date(),
      })
    }, 500)
  },

  addDataCorrection: (correction) => set((state) => ({
    dataCorrections: [
      ...state.dataCorrections,
      {
        ...correction,
        id: Math.random().toString(36).substring(2, 11),
        correctedAt: new Date(),
      },
    ],
  })),

  updateAlertStatus: (alertId, status, note) => set((state) => ({
    alerts: state.alerts.map((alert) =>
      alert.id === alertId
        ? { ...alert, status, correctionNote: note || alert.correctionNote }
        : alert
    ),
  })),
}))
