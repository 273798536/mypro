import { create } from 'zustand'
import type { LaunchParams, TrajectoryResult, ComparisonPair, Anomaly } from '@/types'
import { computeTrajectory } from '@/utils/physics'
import { validateParams } from '@/utils/validation'

interface SimState {
  trajectories: TrajectoryResult[]
  activeTrajectoryId: string | null
  selectedAnomalyFilter: Set<Anomaly['type']>
  timelinePosition: number
  isPlaying: boolean
  comparisonPair: ComparisonPair | null
  showComparison: boolean
  validationErrors: Anomaly[]

  launch: (params: LaunchParams) => void
  removeTrajectory: (id: string) => void
  setActiveTrajectory: (id: string | null) => void
  toggleAnomalyFilter: (type: Anomaly['type']) => void
  setTimelinePosition: (pos: number) => void
  setIsPlaying: (playing: boolean) => void
  startComparison: (oldResult: TrajectoryResult, newParams: LaunchParams) => void
  closeComparison: () => void
  clearAll: () => void
}

let idCounter = 0

export const useSimStore = create<SimState>((set, get) => ({
  trajectories: [],
  activeTrajectoryId: null,
  selectedAnomalyFilter: new Set(),
  timelinePosition: 0,
  isPlaying: false,
  comparisonPair: null,
  showComparison: false,
  validationErrors: [],

  launch: (params: LaunchParams) => {
    const validation = validateParams(params)
    if (!validation.valid) {
      set({ validationErrors: validation.anomalies })
      return
    }

    const adjustedParams = { ...params }
    if (adjustedParams.dragCoefficient < 0) adjustedParams.dragCoefficient = 0

    const result = computeTrajectory(adjustedParams)
    const trajResult: TrajectoryResult = {
      id: `traj_${++idCounter}_${Date.now()}`,
      params: adjustedParams,
      ...result,
    }

    set(state => ({
      trajectories: [...state.trajectories, trajResult],
      activeTrajectoryId: trajResult.id,
      validationErrors: [],
    }))
  },

  removeTrajectory: (id: string) => {
    set(state => ({
      trajectories: state.trajectories.filter(t => t.id !== id),
      activeTrajectoryId: state.activeTrajectoryId === id ? null : state.activeTrajectoryId,
    }))
  },

  setActiveTrajectory: (id) => set({ activeTrajectoryId: id }),

  toggleAnomalyFilter: (type) => {
    set(state => {
      const next = new Set(state.selectedAnomalyFilter)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return { selectedAnomalyFilter: next }
    })
  },

  setTimelinePosition: (pos) => set({ timelinePosition: pos }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  startComparison: (oldResult, newParams) => {
    const validation = validateParams(newParams)
    if (!validation.valid) {
      set({ validationErrors: validation.anomalies })
      return
    }
    const adjustedParams = { ...newParams }
    if (adjustedParams.dragCoefficient < 0) adjustedParams.dragCoefficient = 0

    const newTraj = computeTrajectory(adjustedParams)
    const newResult: TrajectoryResult = {
      id: `traj_${++idCounter}_${Date.now()}`,
      params: adjustedParams,
      ...newTraj,
    }

    const paramDiff: Partial<LaunchParams> = {}
    if (oldResult.params.velocity !== newResult.params.velocity) paramDiff.velocity = newResult.params.velocity
    if (oldResult.params.angle !== newResult.params.angle) paramDiff.angle = newResult.params.angle
    if (oldResult.params.dragCoefficient !== newResult.params.dragCoefficient) paramDiff.dragCoefficient = newResult.params.dragCoefficient

    set(state => ({
      trajectories: [...state.trajectories, newResult],
      comparisonPair: { oldResult, newResult, paramDiff },
      showComparison: true,
      activeTrajectoryId: newResult.id,
      validationErrors: [],
    }))
  },

  closeComparison: () => set({ comparisonPair: null, showComparison: false }),
  clearAll: () => set({ trajectories: [], activeTrajectoryId: null, comparisonPair: null, showComparison: false, timelinePosition: 0, isPlaying: false }),
}))
