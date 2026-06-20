import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Run, FunnelStage, Note, Conclusion, Screenshot, GrayscaleResult, ConfirmationRecord } from '@/types'

interface FunnelStore {
  runs: Run[]
  activeConfirmation: { run_id: string; reason: string; next_step: string } | null

  addRun: (run: Run) => void
  updateRun: (run_id: string, updates: Partial<Run>) => void
  removeRun: (run_id: string) => void
  findRun: (run_id: string) => Run | undefined
  checkRunExists: (run_id: string) => boolean
  deduplicateRuns: () => void

  addStage: (run_id: string, stage: FunnelStage) => void
  updateStage: (run_id: string, stage_id: string, updates: Partial<FunnelStage>) => void

  addNote: (run_id: string, note: Note) => void
  linkNoteToConclusion: (run_id: string, note_id: string, conclusion_id: string) => void

  setConclusion: (run_id: string, conclusion: Conclusion) => void
  updateConclusion: (run_id: string, updates: Partial<Conclusion>) => void

  addScreenshot: (run_id: string, screenshot: Screenshot) => void
  updateScreenshotDescription: (run_id: string, screenshot_id: string, description: string) => void
  removeScreenshot: (run_id: string, screenshot_id: string) => void

  addGrayscaleResult: (run_id: string, result: GrayscaleResult) => void

  requestConfirmation: (run_id: string, reason: string, next_step: string) => void
  resolveConfirmation: (action: 'merge' | 'overwrite' | 'cancel') => void

  getStats: () => { active: number; pending: number; completed: number }
}

export const useFunnelStore = create<FunnelStore>()(
  persist(
    (set, get) => ({
      runs: [],
      activeConfirmation: null,

      addRun: (run) =>
        set((state) => ({
          runs: [...state.runs, run],
        })),

      updateRun: (run_id, updates) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.run_id === run_id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
          ),
        })),

      removeRun: (run_id) =>
        set((state) => ({
          runs: state.runs.filter((r) => r.run_id !== run_id),
        })),

      findRun: (run_id) => get().runs.find((r) => r.run_id === run_id),

      checkRunExists: (run_id) => get().runs.some((r) => r.run_id === run_id),

      deduplicateRuns: () =>
        set((state) => {
          const seen = new Set<string>()
          const unique = state.runs.filter((r) => {
            if (seen.has(r.run_id)) return false
            seen.add(r.run_id)
            return true
          })
          return { runs: unique }
        }),

      addStage: (run_id, stage) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.run_id === run_id
              ? { ...r, stages: [...r.stages, stage], updated_at: new Date().toISOString() }
              : r
          ),
        })),

      updateStage: (run_id, stage_id, updates) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.run_id === run_id
              ? {
                  ...r,
                  stages: r.stages.map((s) => (s.id === stage_id ? { ...s, ...updates } : s)),
                  updated_at: new Date().toISOString(),
                }
              : r
          ),
        })),

      addNote: (run_id, note) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.run_id === run_id
              ? { ...r, notes: [...r.notes, note], updated_at: new Date().toISOString() }
              : r
          ),
        })),

      linkNoteToConclusion: (run_id, note_id, conclusion_id) =>
        set((state) => ({
          runs: state.runs.map((r) => {
            if (r.run_id !== run_id) return r
            return {
              ...r,
              notes: r.notes.map((n) =>
                n.id === note_id ? { ...n, linked_conclusion_id: conclusion_id } : n
              ),
              conclusion: r.conclusion
                ? {
                    ...r.conclusion,
                    linked_note_ids: r.conclusion.linked_note_ids.includes(note_id)
                      ? r.conclusion.linked_note_ids
                      : [...r.conclusion.linked_note_ids, note_id],
                  }
                : null,
              updated_at: new Date().toISOString(),
            }
          }),
        })),

      setConclusion: (run_id, conclusion) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.run_id === run_id ? { ...r, conclusion, updated_at: new Date().toISOString() } : r
          ),
        })),

      updateConclusion: (run_id, updates) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.run_id === run_id && r.conclusion
              ? {
                  ...r,
                  conclusion: { ...r.conclusion, ...updates, updated_at: new Date().toISOString() },
                  updated_at: new Date().toISOString(),
                }
              : r
          ),
        })),

      addScreenshot: (run_id, screenshot) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.run_id === run_id
              ? { ...r, screenshots: [...r.screenshots, screenshot], updated_at: new Date().toISOString() }
              : r
          ),
        })),

      updateScreenshotDescription: (run_id, screenshot_id, description) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.run_id === run_id
              ? {
                  ...r,
                  screenshots: r.screenshots.map((s) =>
                    s.id === screenshot_id ? { ...s, description } : s
                  ),
                  updated_at: new Date().toISOString(),
                }
              : r
          ),
        })),

      removeScreenshot: (run_id, screenshot_id) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.run_id === run_id
              ? {
                  ...r,
                  screenshots: r.screenshots.filter((s) => s.id !== screenshot_id),
                  updated_at: new Date().toISOString(),
                }
              : r
          ),
        })),

      addGrayscaleResult: (run_id, result) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.run_id === run_id
              ? { ...r, grayscale_results: [...r.grayscale_results, result], updated_at: new Date().toISOString() }
              : r
          ),
        })),

      requestConfirmation: (run_id, reason, next_step) =>
        set({ activeConfirmation: { run_id, reason, next_step } }),

      resolveConfirmation: (action) => {
        const { activeConfirmation, runs } = get()
        if (!activeConfirmation) return

        const record: ConfirmationRecord = {
          id: crypto.randomUUID(),
          run_id: activeConfirmation.run_id,
          reason: activeConfirmation.reason,
          next_step: activeConfirmation.next_step,
          action_taken: action,
          created_at: new Date().toISOString(),
        }

        if (action === 'overwrite') {
          set({
            activeConfirmation: null,
            runs: runs.map((r) =>
              r.run_id === activeConfirmation.run_id
                ? {
                    ...r,
                    status: 'in_progress',
                    stages: [],
                    notes: [],
                    conclusion: null,
                    grayscale_results: [],
                    confirmation_records: [...r.confirmation_records, record],
                    updated_at: new Date().toISOString(),
                  }
                : r
            ),
          })
        } else if (action === 'merge') {
          set({
            activeConfirmation: null,
            runs: runs.map((r) =>
              r.run_id === activeConfirmation.run_id
                ? {
                    ...r,
                    status: 'in_progress',
                    confirmation_records: [...r.confirmation_records, record],
                    updated_at: new Date().toISOString(),
                  }
                : r
            ),
          })
        } else {
          set({
            activeConfirmation: null,
            runs: runs.map((r) =>
              r.run_id === activeConfirmation.run_id
                ? {
                    ...r,
                    confirmation_records: [...r.confirmation_records, record],
                    updated_at: new Date().toISOString(),
                  }
                : r
            ),
          })
        }
      },

      getStats: () => {
        const runs = get().runs
        return {
          active: runs.filter((r) => r.status === 'in_progress').length,
          pending: runs.filter((r) => r.status === 'pending_confirmation').length,
          completed: runs.filter((r) => r.status === 'completed').length,
        }
      },
    }),
    {
      name: 'recall-funnel-store',
    }
  )
)
