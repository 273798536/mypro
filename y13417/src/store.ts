import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Problem, CalcStep, Anomaly, ReviewRecord, EvidenceItem, AnomalyStatus } from './types'
import { generateSeedData } from './utils/seedData'

interface TrackerState {
  problems: Problem[]
  calcSteps: CalcStep[]
  anomalies: Anomaly[]
  reviewRecords: ReviewRecord[]
  evidenceItems: EvidenceItem[]
  selectedProblemId: string | null

  selectProblem: (id: string | null) => void
  resolveAnomaly: (anomalyId: string, note: string) => void
  deferAnomaly: (anomalyId: string, note: string) => void
  addReview: (problemId: string, currentConclusion: string, diffExplanation: string) => void
  addAnomalyNote: (anomalyId: string, note: string) => void
  resetToSeed: () => void
}

const seedData = generateSeedData()

export const useStore = create<TrackerState>()(
  persist(
    (set, get) => ({
      problems: seedData.problems,
      calcSteps: seedData.calcSteps,
      anomalies: seedData.anomalies,
      reviewRecords: seedData.reviewRecords,
      evidenceItems: seedData.evidenceItems,
      selectedProblemId: seedData.problems[0]?.id ?? null,

      selectProblem: (id) => set({ selectedProblemId: id }),

      resolveAnomaly: (anomalyId, note) => {
        const state = get()
        const anomaly = state.anomalies.find(a => a.id === anomalyId)
        if (!anomaly) return

        const now = new Date().toISOString()
        const updatedAnomalies = state.anomalies.map(a =>
          a.id === anomalyId
            ? { ...a, status: 'resolved' as AnomalyStatus, resolutionNote: note, resolvedAt: now }
            : a
        )

        const hasUnresolved = updatedAnomalies.some(a => a.problemId === anomaly.problemId && a.status !== 'resolved')
        let updatedProblems = state.problems
        if (!hasUnresolved) {
          updatedProblems = state.problems.map(p =>
            p.id === anomaly.problemId ? { ...p, status: 'reviewed' as const } : p
          )
        }

        const newEvidence: EvidenceItem = {
          id: `ev-resolve-${Date.now()}`,
          problemId: anomaly.problemId,
          eventType: 'note_added',
          description: `异常[${anomaly.type}]已处理：${note}`,
          relatedCalcStepId: anomaly.calcStepId,
          relatedAnomalyId: anomalyId,
          createdAt: now,
        }

        set({
          anomalies: updatedAnomalies,
          problems: updatedProblems,
          evidenceItems: [...state.evidenceItems, newEvidence],
        })
      },

      deferAnomaly: (anomalyId, note) => {
        const state = get()
        const anomaly = state.anomalies.find(a => a.id === anomalyId)
        if (!anomaly) return

        const now = new Date().toISOString()
        const updatedAnomalies = state.anomalies.map(a =>
          a.id === anomalyId
            ? { ...a, status: 'deferred' as AnomalyStatus, resolutionNote: note, resolvedAt: now }
            : a
        )

        const newEvidence: EvidenceItem = {
          id: `ev-defer-${Date.now()}`,
          problemId: anomaly.problemId,
          eventType: 'note_added',
          description: `异常[${anomaly.type}]已延后：${note || '暂不处理'}`,
          relatedCalcStepId: anomaly.calcStepId,
          relatedAnomalyId: anomalyId,
          createdAt: now,
        }

        set({
          anomalies: updatedAnomalies,
          evidenceItems: [...state.evidenceItems, newEvidence],
        })
      },

      addReview: (problemId, currentConclusion, diffExplanation) => {
        const state = get()
        const problem = state.problems.find(p => p.id === problemId)
        if (!problem) return

        const now = new Date().toISOString()
        const prevReviews = state.reviewRecords.filter(r => r.problemId === problemId)
        const previousConclusion = prevReviews.length > 0
          ? prevReviews[prevReviews.length - 1].currentConclusion
          : `提交答案：{${problem.submittedAnswer.join(', ')}}`

        const newReview: ReviewRecord = {
          id: `review-${Date.now()}`,
          problemId,
          previousConclusion,
          currentConclusion,
          diffExplanation,
          createdAt: now,
        }

        const newEvidence: EvidenceItem = {
          id: `ev-review-${Date.now()}`,
          problemId,
          eventType: 'review',
          description: `复核：结论从"${previousConclusion}"变更为"${currentConclusion}"。${diffExplanation ? `原因：${diffExplanation}` : ''}`,
          relatedCalcStepId: '',
          relatedAnomalyId: '',
          createdAt: now,
        }

        const updatedProblems = state.problems.map(p =>
          p.id === problemId ? { ...p, status: 'reviewed' as const } : p
        )

        set({
          reviewRecords: [...state.reviewRecords, newReview],
          evidenceItems: [...state.evidenceItems, newEvidence],
          problems: updatedProblems,
        })
      },

      addAnomalyNote: (anomalyId, note) => {
        const state = get()
        const anomaly = state.anomalies.find(a => a.id === anomalyId)
        if (!anomaly) return

        const now = new Date().toISOString()
        const newEvidence: EvidenceItem = {
          id: `ev-note-${Date.now()}`,
          problemId: anomaly.problemId,
          eventType: 'note_added',
          description: `备注[${anomaly.type}]：${note}`,
          relatedCalcStepId: anomaly.calcStepId,
          relatedAnomalyId: anomalyId,
          createdAt: now,
        }

        set({
          evidenceItems: [...state.evidenceItems, newEvidence],
        })
      },

      resetToSeed: () => {
        const fresh = generateSeedData()
        set({
          problems: fresh.problems,
          calcSteps: fresh.calcSteps,
          anomalies: fresh.anomalies,
          reviewRecords: fresh.reviewRecords,
          evidenceItems: fresh.evidenceItems,
          selectedProblemId: fresh.problems[0]?.id ?? null,
        })
      },
    }),
    {
      name: 'cutvertex_tracker',
    }
  )
)
