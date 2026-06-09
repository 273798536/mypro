import { create } from 'zustand';
import type { AnalysisSample, DraftData, FilterState, ReviewStatus } from '@/types';
import { initialSamples, initialDrafts } from '@/data/mockData';
import { recomputeSample, applyDraft, analyzeSample } from '@/utils/analysisPipeline';
import type { FlowNode, FlowEdge } from '@/types';

interface StoreState {
  samples: AnalysisSample[];
  drafts: DraftData[];
  filters: FilterState;
  activeDraftNotice: boolean;
  setFilters: (f: Partial<FilterState>) => void;
  getSampleById: (id: string) => AnalysisSample | undefined;
  getDuplicatePairs: () => { sample1: AnalysisSample; sample2: AnalysisSample; score: number; reason: string }[];
  setReviewStatus: (sampleId: string, status: ReviewStatus, comment?: string) => void;
  addSample: (name: string, nodes: FlowNode[], edges: FlowEdge[], sourceId: string, sinkId: string) => void;
  applyDraftToSample: (draftId: string) => void;
  dismissDraft: (draftId: string) => void;
  setActiveDraftNotice: (v: boolean) => void;
  getPendingReviewCount: () => number;
  getDraftCount: () => number;
  recomputeAll: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  samples: initialSamples,
  drafts: initialDrafts,
  filters: {
    status: 'all',
    onlyDuplicates: false,
    onlyReviewed: 'all',
    search: '',
  },
  activeDraftNotice: true,

  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),

  getSampleById: (id) => get().samples.find((s) => s.id === id),

  getDuplicatePairs: () => {
    const { samples } = get();
    const pairs: { sample1: AnalysisSample; sample2: AnalysisSample; score: number; reason: string }[] = [];
    const seen = new Set<string>();
    samples.forEach((s) => {
      if (s.isDuplicate && s.duplicatePair && !seen.has(s.id)) {
        const s1 = samples.find((x) => x.id === s.duplicatePair!.sampleId1);
        const s2 = samples.find((x) => x.id === s.duplicatePair!.sampleId2);
        if (s1 && s2) {
          pairs.push({ sample1: s1, sample2: s2, score: s.duplicatePair.similarityScore, reason: s.duplicatePair.reason });
          seen.add(s1.id);
          seen.add(s2.id);
        }
      }
    });
    return pairs;
  },

  setReviewStatus: (sampleId, status, comment) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.id === sampleId
          ? { ...s, reviewed: true, reviewStatus: status, reviewComment: comment, updatedAt: new Date().toISOString() }
          : s
      ),
    })),

  addSample: (name, nodes, edges, sourceId, sinkId) => {
    const id = `sample-${Date.now()}`;
    const newSample = analyzeSample(id, name, nodes, edges, sourceId, sinkId, get().samples);
    set((state) => ({ samples: [...state.samples, newSample] }));
  },

  applyDraftToSample: (draftId) => {
    const { drafts, samples } = get();
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return;
    const original = samples.find((s) => s.id === draft.sampleId);
    if (!original) return;

    const updated = applyDraft(original, draft);
    const otherSamples = samples.filter((s) => s.id !== original.id);
    const rechecked = recomputeSample(updated, otherSamples);

    set((state) => ({
      samples: state.samples.map((s) => (s.id === original.id ? rechecked : s)),
      drafts: state.drafts.filter((d) => d.id !== draftId),
    }));
  },

  dismissDraft: (draftId) =>
    set((state) => ({ drafts: state.drafts.filter((d) => d.id !== draftId) })),

  setActiveDraftNotice: (v) => set({ activeDraftNotice: v }),

  getPendingReviewCount: () => get().samples.filter((s) => !s.reviewed && s.status !== 'bad_data').length,

  getDraftCount: () => get().drafts.length,

  recomputeAll: () => {
    const { samples } = get();
    const recomputed: AnalysisSample[] = [];
    for (const s of samples) {
      recomputed.push(recomputeSample(s, recomputed));
    }
    set({ samples: recomputed });
  },
}));
