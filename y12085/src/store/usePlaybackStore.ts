import { create } from 'zustand'
import type { KeypointFrame, Measure, ErrorLabel, PracticeRecord, FilterConditions } from '@/types'
import { practiceRecords, keypointFrames, measures, errorLabels } from '@/data/mockData'

interface PlaybackStore {
  currentTimestamp: number
  currentPracticeId: string
  isPlaying: boolean
  playbackSpeed: number
  filterConditions: FilterConditions

  practiceRecords: PracticeRecord[]
  keypointFrames: KeypointFrame[]
  measures: Measure[]
  errorLabels: ErrorLabel[]

  setCurrentTimestamp: (ts: number) => void
  setCurrentPractice: (id: string) => void
  togglePlay: () => void
  setPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  setFilterConditions: (filters: Partial<FilterConditions>) => void

  getFilteredErrors: () => ErrorLabel[]
  getFilteredPractices: () => PracticeRecord[]
  getCurrentFrame: () => KeypointFrame | undefined
  getCurrentMeasures: () => Measure[]
  getActiveMeasure: () => Measure | undefined
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  currentTimestamp: 0,
  currentPracticeId: practiceRecords[0].id,
  isPlaying: false,
  playbackSpeed: 1,
  filterConditions: {
    studentName: '',
    pieceTitle: '',
    errorTypes: ['KEYPOINT_LOSS', 'MEASURE_MISALIGN'],
  },

  practiceRecords,
  keypointFrames,
  measures,
  errorLabels,

  setCurrentTimestamp: (ts) => set({ currentTimestamp: ts }),
  setCurrentPractice: (id) => set({ currentPracticeId: id, currentTimestamp: 0, isPlaying: false }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setFilterConditions: (filters) =>
    set((s) => ({
      filterConditions: { ...s.filterConditions, ...filters },
    })),

  getFilteredErrors: () => {
    const { currentPracticeId, filterConditions, errorLabels } = get()
    return errorLabels.filter((e) => {
      if (e.practiceId !== currentPracticeId) return false
      if (filterConditions.errorTypes.length > 0 && !filterConditions.errorTypes.includes(e.type as 'KEYPOINT_LOSS' | 'MEASURE_MISALIGN')) return false
      return true
    })
  },

  getFilteredPractices: () => {
    const { practiceRecords, filterConditions } = get()
    return practiceRecords.filter((p) => {
      if (filterConditions.studentName && p.studentName !== filterConditions.studentName) return false
      if (filterConditions.pieceTitle && p.pieceTitle !== filterConditions.pieceTitle) return false
      return true
    })
  },

  getCurrentFrame: () => {
    const { currentPracticeId, currentTimestamp, keypointFrames } = get()
    const frames = keypointFrames.filter((f) => f.practiceId === currentPracticeId)
    if (frames.length === 0) return undefined
    let closest = frames[0]
    let minDiff = Math.abs(frames[0].timestamp - currentTimestamp)
    for (const f of frames) {
      const diff = Math.abs(f.timestamp - currentTimestamp)
      if (diff < minDiff) {
        minDiff = diff
        closest = f
      }
    }
    return closest
  },

  getCurrentMeasures: () => {
    const { currentPracticeId } = get()
    return get().measures.filter((m) => m.practiceId === currentPracticeId)
  },

  getActiveMeasure: () => {
    const { currentTimestamp } = get()
    const currentMeasures = get().getCurrentMeasures()
    return currentMeasures.find(
      (m) => currentTimestamp >= m.startTimestamp && currentTimestamp < m.endTimestamp
    )
  },
}))
