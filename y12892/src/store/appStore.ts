import { create } from 'zustand'

export interface WaveParameter {
  value: number | string
  unit?: string
  explanation: string
}

export interface ComputeResult {
  batchId: string
  timestamp: string
  parameters: {
    hs: WaveParameter
    tp: WaveParameter
    spectrumType: WaveParameter
    windWaveRatio: WaveParameter
    swellRatio: WaveParameter
    dominantDirection: WaveParameter
  }
  riskLevel: 'low' | 'medium' | 'high'
  waterQualityAlert: 'normal' | 'watch' | 'warning'
  processingRecordId: string
}

export interface BuoyData {
  significantWaveHeight: number
  peakPeriod: number
  mainDirection: number
  windSpeed: number
  windDirection: number
  waterTemp: number
}

export interface ForecastData {
  forecastWaveHeight: number
  forecastPeriod: number
  forecastDirection: number
  arrivalTime: string
  isLate: boolean
}

export interface Correction {
  id: string
  batchId: string
  field: string
  originalValue: string
  correctedValue: string
  reason: string
  createdAt: string
  type?: string
  correctedForecast?: any
  correctedBy?: string
}

export interface ProcessingOpinion {
  id: string
  batchId: string
  opinion: string
  shipTrajectory?: { lat: number; lng: number; timestamp: string }[]
  submittedBy: string
  createdAt: string
}

export interface ProcessingRecord {
  id: string
  batchId: string
  algorithm: string
  inputSummary: any
  outputSummary?: any
  riskLevel: string
  waterQualityAlert: string
  timestamp?: string
  createdAt?: string
  rawDataId?: string
  parametersId?: string
}

interface AppState {
  currentBatchId: string | null
  computeResult: ComputeResult | null
  buoyData: BuoyData
  forecastData: ForecastData | null
  inspectionPhotos: string[]
  buoyOfflineEvents: { startTime: string; endTime: string; reason: string }[]
  corrections: Correction[]
  opinions: ProcessingOpinion[]
  processingRecords: ProcessingRecord[]
  isComputing: boolean
  activeTab: string
  setCurrentBatchId: (id: string | null) => void
  setComputeResult: (result: ComputeResult | null) => void
  setBuoyData: (data: BuoyData) => void
  setForecastData: (data: ForecastData | null) => void
  setInspectionPhotos: (photos: string[]) => void
  setBuoyOfflineEvents: (events: any[]) => void
  setCorrections: (corrections: Correction[]) => void
  setOpinions: (opinions: ProcessingOpinion[]) => void
  setProcessingRecords: (records: ProcessingRecord[]) => void
  setIsComputing: (loading: boolean) => void
  setActiveTab: (tab: string) => void
  addCorrection: (correction: Correction) => void
  addOpinion: (opinion: ProcessingOpinion) => void
  resetAll: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentBatchId: null,
  computeResult: null,
  buoyData: {
    significantWaveHeight: 1.8,
    peakPeriod: 9.5,
    mainDirection: 135,
    windSpeed: 8.5,
    windDirection: 120,
    waterTemp: 24.5,
  },
  forecastData: {
    forecastWaveHeight: 2.1,
    forecastPeriod: 10.2,
    forecastDirection: 140,
    arrivalTime: '2026-06-16T14:30:00Z',
    isLate: true,
  },
  inspectionPhotos: [
    'photo_001.jpg',
    'photo_002.jpg',
    'photo_003.jpg',
  ],
  buoyOfflineEvents: [
    { startTime: '2026-06-16T02:15:00Z', endTime: '2026-06-16T03:45:00Z', reason: '浮标电池更换' },
  ],
  corrections: [],
  opinions: [],
  processingRecords: [],
  isComputing: false,
  activeTab: 'compute',
  setCurrentBatchId: (id) => set({ currentBatchId: id }),
  setComputeResult: (result) => set({ computeResult: result }),
  setBuoyData: (data) => set({ buoyData: data }),
  setForecastData: (data) => set({ forecastData: data }),
  setInspectionPhotos: (photos) => set({ inspectionPhotos: photos }),
  setBuoyOfflineEvents: (events) => set({ buoyOfflineEvents: events }),
  setCorrections: (corrections) => set({ corrections }),
  setOpinions: (opinions) => set({ opinions }),
  setProcessingRecords: (records) => set({ processingRecords: records }),
  setIsComputing: (loading) => set({ isComputing: loading }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  addCorrection: (correction) => set((state) => ({ corrections: [...state.corrections, correction] })),
  addOpinion: (opinion) => set((state) => ({ opinions: [...state.opinions, opinion] })),
  resetAll: () => set({
    currentBatchId: null,
    computeResult: null,
    corrections: [],
    opinions: [],
    processingRecords: [],
  }),
}))
