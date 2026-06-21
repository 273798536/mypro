import { create } from "zustand";
import type { Batch, BatchResultItem, BatchRunInput } from "@/types";
import { mockBatches, mockBatchResults } from "@/utils/mockData";
import { runIdempotentBatch } from "@/utils/idempotent";
import { useParameterStore } from "./useParameterStore";

interface BatchState {
  batches: Batch[];
  results: BatchResultItem[];
  selectedBatchId: string | null;
  setSelectedBatch: (id: string | null) => void;
  runBatch: (input: BatchRunInput) => { batch: Batch; results: BatchResultItem[] };
  applyBatch: (batchId: string) => void;
  getResultsByBatchId: (batchId: string) => BatchResultItem[];
  getLatestBatch: () => Batch | undefined;
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batches: mockBatches,
  results: mockBatchResults,
  selectedBatchId: null,

  setSelectedBatch: (id) => set({ selectedBatchId: id }),

  runBatch: (input) => {
    const existingParameters = useParameterStore.getState().parameters;
    const latestBatch = get().getLatestBatch();

    const { batch, results, newParameters } = runIdempotentBatch(
      input,
      existingParameters,
      latestBatch?.id,
    );

    set((state) => ({
      batches: [batch, ...state.batches],
      results: [...results, ...state.results],
      selectedBatchId: batch.id,
    }));

    return { batch, results };
  },

  applyBatch: (batchId) => {
    const results = get().getResultsByBatchId(batchId);
    const newParams = results
      .filter((r) => r.resultType === "new")
      .map((r) => {
        const existing = useParameterStore.getState().getParameterById(r.parameterId);
        if (existing) return existing;
        return null;
      })
      .filter(Boolean);

    if (newParams.length > 0) {
      useParameterStore.getState().addParameters(newParams as any[]);
    }
  },

  getResultsByBatchId: (batchId) =>
    get().results.filter((r) => r.batchId === batchId),

  getLatestBatch: () => {
    const batches = get().batches;
    if (batches.length === 0) return undefined;
    return batches.sort(
      (a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime(),
    )[0];
  },
}));
