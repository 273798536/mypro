import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScoreStore, FilterState, Score, Version, Annotation, Part, Anomaly, SyncTask, AnomalyStatus } from '../types'

const initialFilters: FilterState = {
  status: 'all',
  search: '',
  dateRange: {},
}

export const useScoreStore = create<ScoreStore>()(
  persist(
    (set, get) => ({
      scores: [],
      versions: [],
      annotations: [],
      parts: [],
      anomalies: [],
      tasks: [],
      filters: initialFilters,
      loading: false,

      setScores: (scores: Score[]) => set({ scores }),
      setVersions: (versions: Version[]) => set({ versions }),
      setAnnotations: (annotations: Annotation[]) => set({ annotations }),
      setParts: (parts: Part[]) => set({ parts }),
      setAnomalies: (anomalies: Anomaly[]) => set({ anomalies }),
      setTasks: (tasks: SyncTask[]) => set({ tasks }),

      setFilters: (filters: Partial<FilterState>) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      addScore: (score: Score) =>
        set((state) => ({
          scores: [...state.scores, score],
        })),

      updateScore: (id: string, score: Partial<Score>) =>
        set((state) => ({
          scores: state.scores.map((s) =>
            s.id === id ? { ...s, ...score, updatedAt: new Date().toISOString() } : s
          ),
        })),

      addVersion: (version: Version) =>
        set((state) => ({
          versions: [...state.versions, version],
        })),

      addAnnotation: (annotation: Annotation) =>
        set((state) => ({
          annotations: [...state.annotations, annotation],
        })),

      addPart: (part: Part) =>
        set((state) => ({
          parts: [...state.parts, part],
        })),

      addAnomaly: (anomaly: Anomaly) =>
        set((state) => ({
          anomalies: [...state.anomalies, anomaly],
        })),

      updateAnomalyStatus: (id: string, status: AnomalyStatus) =>
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === id ? { ...a, status } : a
          ),
        })),

      addTask: (task: SyncTask) =>
        set((state) => ({
          tasks: [...state.tasks, task],
        })),

      updateTask: (id: string, task: Partial<SyncTask>) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...task } : t
          ),
        })),

      getFilteredScores: () => {
        const { scores, filters } = get()
        return scores.filter((score) => {
          if (filters.status !== 'all' && score.status !== filters.status) {
            return false
          }
          if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            if (
              !score.title.toLowerCase().includes(searchLower) &&
              !score.composer.toLowerCase().includes(searchLower)
            ) {
              return false
            }
          }
          if (filters.dateRange.start) {
            if (score.createdAt < filters.dateRange.start) {
              return false
            }
          }
          if (filters.dateRange.end) {
            if (score.createdAt > filters.dateRange.end) {
              return false
            }
          }
          return true
        })
      },

      getScoreById: (id: string) => {
        return get().scores.find((s) => s.id === id)
      },

      getVersionsByScoreId: (scoreId: string) => {
        return get()
          .versions.filter((v) => v.scoreId === scoreId)
          .sort((a, b) => b.versionNumber - a.versionNumber)
      },

      getAnnotationsByScoreId: (scoreId: string) => {
        return get()
          .annotations.filter((a) => a.scoreId === scoreId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      },

      getPartsByScoreId: (scoreId: string) => {
        return get().parts.filter((p) => p.scoreId === scoreId)
      },

      getAnomaliesByScoreId: (scoreId: string) => {
        return get()
          .anomalies.filter((a) => a.scoreId === scoreId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      },

      getTasksByScoreId: (scoreId: string) => {
        return get()
          .tasks.filter((t) => t.scoreId === scoreId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      },

      getStats: () => {
        const { scores } = get()
        return {
          total: scores.length,
          normal: scores.filter((s) => s.status === 'normal').length,
          pending: scores.filter((s) => s.status === 'pending').length,
          anomaly: scores.filter((s) => s.status === 'anomaly').length,
        }
      },
    }),
    {
      name: 'score-storage',
    }
  )
)
