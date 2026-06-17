import { create } from "zustand";
import { batches, defaultBatchId } from "@/data/mockData";
import type { Batch } from "@/data/types";

interface CheckState {
  batchId: string;
  batch: Batch;
  setBatch: (id: string) => void;
}

export const useCheckStore = create<CheckState>((set) => ({
  batchId: defaultBatchId,
  batch: batches[0],
  setBatch: (id) => {
    const found = batches.find((b) => b.id === id) ?? batches[0];
    set({ batchId: found.id, batch: found });
  },
}));

export const allBatches = batches;
