import { create } from 'zustand'
import type { ManualCorrection, ProcessStatus, SampleEvidence } from '@/types'
import { workOrders as seedOrders, samples as seedSamples } from '@/data/mockData'

interface NewCorrectionInput {
  sampleId: string
  manualScore: number
  reason: string
  reviewer: string
}

interface ReviewState {
  orders: typeof seedOrders
  samples: SampleEvidence[]
  selectedSampleId: string | null
  sourceFilter: string | null
  guardOpen: boolean
  guardSampleId: string | null
  setSelected: (sampleId: string | null) => void
  setSourceFilter: (source: string | null) => void
  applyCorrection: (input: NewCorrectionInput) => void
  resolveOverwrite: (sampleId: string, keepManual: boolean) => void
  markStatus: (orderId: string, status: ProcessStatus) => void
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export const useReviewStore = create<ReviewState>((set, get) => ({
  orders: clone(seedOrders),
  samples: clone(seedSamples),
  selectedSampleId: seedSamples[0]?.sampleId ?? null,
  sourceFilter: null,
  guardOpen: false,
  guardSampleId: null,

  setSelected: (sampleId) => set({ selectedSampleId: sampleId }),

  setSourceFilter: (source) => set({ sourceFilter: source }),

  applyCorrection: (input) => {
    const { samples } = get()
    const target = samples.find((s) => s.sampleId === input.sampleId)
    if (!target) return

    const existing = target.manualCorrection
    const willOverwrite =
      existing !== undefined &&
      (Math.abs(input.manualScore - existing.manualScore) >= 3 ||
        Math.sign(input.manualScore - target.machineScore) !==
          Math.sign(existing.manualScore - target.machineScore))

    if (willOverwrite) {
      set({ guardOpen: true, guardSampleId: input.sampleId })
      return
    }

    set((state) => ({
      samples: state.samples.map((s) => {
        if (s.sampleId !== input.sampleId) return s
        const correction: ManualCorrection = {
          correctionId: `COR-${input.sampleId.split('-').pop()}-${Date.now()
            .toString(36)
            .slice(-4)}`,
          sampleId: input.sampleId,
          originalScore: s.machineScore,
          manualScore: input.manualScore,
          reason: input.reason,
          reviewer: input.reviewer || '负责人·周',
          createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          overwritten: false,
        }
        return { ...s, manualCorrection: correction }
      }),
    }))
  },

  resolveOverwrite: (sampleId, keepManual) => {
    set({ guardOpen: false, guardSampleId: null })
    if (!keepManual) {
      return
    }
    set((state) => ({
      samples: state.samples.map((s) =>
        s.manualCorrection && s.sampleId === sampleId
          ? {
              ...s,
              manualCorrection: {
                ...s.manualCorrection,
                overwritten: false,
                overwriteByNewResult: false,
              },
            }
          : s,
      ),
    }))
  },

  markStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.orderId === orderId ? { ...o, status } : o,
      ),
    })),
}))
