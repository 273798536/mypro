import { create } from 'zustand'
import {
  paramVersions,
  steps,
  paramValues,
  anomalies,
  evidences,
} from '@/data/mockData'
import type {
  ParamVersion,
  Step,
  ParamValue,
  Anomaly,
  Evidence,
} from '@/types'

interface ReplayState {
  currentVersionId: string
  expandedStepId: string | null
  paramVersions: ParamVersion[]
  steps: Step[]
  paramValues: ParamValue[]
  anomalies: Anomaly[]
  evidences: Evidence[]
  setVersion: (id: string) => void
  toggleStep: (id: string | null) => void
  resolveAnomaly: (id: string) => void
  toggleEvidence: (id: string) => void
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  currentVersionId: 'v1',
  expandedStepId: 's5',
  paramVersions,
  steps,
  paramValues,
  anomalies,
  evidences,
  setVersion: (id) => set({ currentVersionId: id }),
  toggleStep: (id) =>
    set({ expandedStepId: get().expandedStepId === id ? null : id }),
  resolveAnomaly: (id) =>
    set({
      anomalies: get().anomalies.map((a) =>
        a.id === id ? { ...a, status: 'resolved' } : a,
      ),
    }),
  toggleEvidence: (id) =>
    set({
      evidences: get().evidences.map((e) =>
        e.id === id ? { ...e, provided: !e.provided } : e,
      ),
    }),
}))

export const selectCurrentParams = (s: ReplayState): ParamValue[] =>
  s.paramValues.filter((p) => p.versionId === s.currentVersionId)

