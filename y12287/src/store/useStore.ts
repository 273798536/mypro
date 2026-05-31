import { create } from 'zustand'
import type { ContactPoint, CorrectionRecord, DiagnosticAlert, ViewMode, InputFile } from '@/types'
import { mockContactPoints, mockAlerts, mockInputFiles, mockGrindingSuggestions, mockDentalModels } from '@/data/mockData'
import type { DentalModel, GrindingSuggestion } from '@/types'

interface AppState {
  dentalModels: DentalModel[]
  contactPoints: ContactPoint[]
  grindingSuggestions: GrindingSuggestion[]
  alerts: DiagnosticAlert[]
  inputFiles: InputFile[]
  corrections: CorrectionRecord[]
  selectedTooth: string | null
  viewMode: ViewMode
  showHeatmap: boolean
  dataGaps: string[]

  setSelectedTooth: (tooth: string | null) => void
  setViewMode: (mode: ViewMode) => void
  toggleHeatmap: () => void
  addCorrection: (correction: CorrectionRecord) => void
  updateContactPoint: (id: string, x: number, y: number, z: number) => void
}

export const useStore = create<AppState>((set) => ({
  dentalModels: mockDentalModels,
  contactPoints: mockContactPoints,
  grindingSuggestions: mockGrindingSuggestions,
  alerts: mockAlerts,
  inputFiles: mockInputFiles,
  corrections: [],
  selectedTooth: null,
  viewMode: 'free',
  showHeatmap: true,
  dataGaps: ['牙齿#12-#13区域网格（上颌牙模-B）'],

  setSelectedTooth: (tooth) => set({ selectedTooth: tooth }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
  addCorrection: (correction) => set((s) => ({ corrections: [...s.corrections, correction] })),
  updateContactPoint: (id, x, y, z) => set((s) => ({
    contactPoints: s.contactPoints.map((cp) =>
      cp.id === id ? { ...cp, positionX: x, positionY: y, positionZ: z } : cp
    ),
  })),
}))
