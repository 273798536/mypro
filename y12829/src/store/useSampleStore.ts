import { create } from "zustand";
import { PrimerSample, FilterStatus, SampleStatus, ReviewNote, LineageNode } from "@/types";
import { mockSamples } from "@/data/mockSamples";

interface AppState {
  samples: PrimerSample[];
  selectedId: string | null;
  filterStatus: FilterStatus;
  searchKeyword: string;

  selectSample: (id: string | null) => void;
  setFilter: (s: FilterStatus) => void;
  setSearch: (kw: string) => void;
  addReviewNote: (
    sampleId: string,
    note: Omit<ReviewNote, "id" | "timestamp">,
    lineageNote: string
  ) => void;
  updateSampleStatus: (
    sampleId: string,
    newStatus: SampleStatus,
    reason: string
  ) => void;
  filteredSamples: () => PrimerSample[];
  getById: (id: string) => PrimerSample | undefined;
  stats: () => {
    total: number;
    normal: number;
    borderline: number;
    abnormal: number;
    pendingReview: number;
  };
}

export const useSampleStore = create<AppState>((set, get) => ({
  samples: mockSamples,
  selectedId: null,
  filterStatus: "all",
  searchKeyword: "",

  selectSample: (id) => set({ selectedId: id }),

  setFilter: (s) => set({ filterStatus: s }),

  setSearch: (kw) => set({ searchKeyword: kw }),

  addReviewNote: (sampleId, note, lineageNote) => {
    set((state) => {
      const samples = state.samples.map((s) => {
        if (s.id !== sampleId) return s;
        const newReview: ReviewNote = {
          ...note,
          id: `R-${Date.now()}`,
          timestamp: Date.now(),
        };
        const newLineage: LineageNode[] = note.updatesLineage
          ? [
              ...s.lineage,
              {
                id: `L-${Date.now()}`,
                stage: `复核${s.reviews.length + 1}`,
                operator: note.author,
                timestamp: Date.now(),
                statusBefore: s.status,
                statusAfter: note.newStatus ?? s.status,
                note: lineageNote,
                relatedReviewId: newReview.id,
              },
            ]
          : s.lineage;
        return {
          ...s,
          reviews: [...s.reviews, newReview],
          status: note.newStatus ?? s.status,
          lineage: newLineage,
        };
      });
      return { samples };
    });
  },

  updateSampleStatus: (sampleId, newStatus, reason) => {
    set((state) => {
      const samples = state.samples.map((s) => {
        if (s.id !== sampleId) return s;
        return {
          ...s,
          status: newStatus,
          lineage: [
            ...s.lineage,
            {
              id: `L-MAN-${Date.now()}`,
              stage: "状态人工调整",
              operator: "管理员",
              timestamp: Date.now(),
              statusBefore: s.status,
              statusAfter: newStatus,
              note: reason,
            },
          ],
        };
      });
      return { samples };
    });
  },

  filteredSamples: () => {
    const { samples, filterStatus, searchKeyword } = get();
    return samples.filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        return (
          s.id.toLowerCase().includes(kw) ||
          s.name.toLowerCase().includes(kw) ||
          s.location.toLowerCase().includes(kw) ||
          s.batch.toLowerCase().includes(kw)
        );
      }
      return true;
    });
  },

  getById: (id) => get().samples.find((s) => s.id === id),

  stats: () => {
    const { samples } = get();
    const total = samples.length;
    const normal = samples.filter((s) => s.status === SampleStatus.NORMAL).length;
    const borderline = samples.filter((s) => s.status === SampleStatus.BORDERLINE).length;
    const abnormal = samples.filter((s) => s.status === SampleStatus.ABNORMAL).length;
    const pendingReview = samples.filter((s) => s.reviews.length === 0 || s.status === SampleStatus.BORDERLINE).length;
    return { total, normal, borderline, abnormal, pendingReview };
  },
}));
