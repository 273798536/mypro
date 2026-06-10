import { create } from "zustand"
import dayjs from "dayjs"
import {
  Sample,
  BatchSummary,
  RunRecord,
  INITIAL_SAMPLES,
  BATCHES,
  computeSampleStatus,
} from "./types"

interface TiterStore {
  samples: Sample[]
  batches: string[]
  currentBatch: string
  runHistory: RunRecord[]
  selectedSampleId: string | null

  setCurrentBatch: (batch: string) => void
  selectSample: (id: string | null) => void
  addSample: (
    speciesName: string,
    titerValue: number,
    batchNo: string
  ) => Sample
  confirmSynonym: (sampleId: string) => void
  rejectSample: (sampleId: string) => void
  getBatchSummary: (batch: string) => BatchSummary
  getSamplesByBatch: (batch: string) => Sample[]
  getSynonymSamples: (batch: string) => Sample[]
  getContaminatedSamples: (batch: string) => Sample[]
  createRun: (batch: string) => RunRecord
}

export const useTiterStore = create<TiterStore>((set, get) => ({
  samples: INITIAL_SAMPLES,
  batches: BATCHES,
  currentBatch: BATCHES[0],
  runHistory: [],
  selectedSampleId: null,

  setCurrentBatch: (batch) => set({ currentBatch: batch, selectedSampleId: null }),

  selectSample: (id) => set({ selectedSampleId: id }),

  addSample: (speciesName, titerValue, batchNo) => {
    const detection = computeSampleStatus(speciesName)
    const now = dayjs().toISOString()
    const id = `S${String(get().samples.length + 1).padStart(3, "0")}`
    const sample: Sample = {
      id,
      speciesName,
      standardName: detection.standardName,
      titerValue,
      batchNo,
      status: detection.status,
      blockReason: detection.blockReason,
      isSynonym: detection.isSynonym,
      isContaminated: detection.isContaminated,
      createdAt: now,
    }
    set((state) => ({ samples: [...state.samples, sample] }))
    return sample
  },

  confirmSynonym: (sampleId) => {
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === sampleId
          ? {
              ...s,
              status: "pass" as const,
              blockReason: null,
              isSynonym: false,
              speciesName: s.standardName || s.speciesName,
            }
          : s
      ),
    }))
  },

  rejectSample: (sampleId) => {
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === sampleId
          ? {
              ...s,
              status: "bad" as const,
              blockReason: s.blockReason
                ? `${s.blockReason}（已确认拒绝）`
                : "已确认拒绝",
            }
          : s
      ),
    }))
  },

  getBatchSummary: (batch) => {
    const samples = get().samples.filter((s) => s.batchNo === batch)
    return {
      batchNo: batch,
      total: samples.length,
      passCount: samples.filter((s) => s.status === "pass").length,
      pendingCount: samples.filter((s) => s.status === "pending").length,
      badCount: samples.filter((s) => s.status === "bad").length,
    }
  },

  getSamplesByBatch: (batch) => {
    return get().samples.filter((s) => s.batchNo === batch)
  },

  getSynonymSamples: (batch) => {
    return get()
      .samples.filter((s) => s.batchNo === batch && s.isSynonym)
  },

  getContaminatedSamples: (batch) => {
    return get()
      .samples.filter((s) => s.batchNo === batch && s.isContaminated)
  },

  createRun: (batch) => {
    const runId = `R${dayjs().format("YYYYMMDD_HHmmss")}`
    const samples = get().samples.filter((s) => s.batchNo === batch)
    const record: RunRecord = {
      runId,
      batchNo: batch,
      timestamp: dayjs().toISOString(),
      sampleCount: samples.length,
    }
    set((state) => ({ runHistory: [...state.runHistory, record] }))
    return record
  },
}))
