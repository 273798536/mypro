import { create } from 'zustand';
import type { ReviewItem, CalculationResult, TimelineEvent } from '@/types';
import { MOCK_REVIEW_ITEMS, MOCK_CALCULATION_RESULTS, MOCK_TIMELINE } from '@/data/mockBatch';

interface BatchState {
  reviewItems: ReviewItem[];
  calculationResults: CalculationResult[];
  timeline: TimelineEvent[];
  addReviewItem: (item: Omit<ReviewItem, 'id'>) => void;
  updateReviewItem: (id: string, updates: Partial<ReviewItem>) => void;
  addCalculationResult: (result: Omit<CalculationResult, 'id'>) => void;
  clearCalculationResults: () => void;
  addTimelineEvent: (event: Omit<TimelineEvent, 'id'>) => void;
  loadMockData: () => void;
  resetData: () => void;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

export const useBatchStore = create<BatchState>((set) => ({
  reviewItems: [],
  calculationResults: [],
  timeline: [],

  addReviewItem: (item) => set((state) => ({
    reviewItems: [...state.reviewItems, { ...item, id: generateId() }],
  })),
  updateReviewItem: (id, updates) => set((state) => ({
    reviewItems: state.reviewItems.map((r) => (r.id === id ? { ...r, ...updates } : r)),
  })),

  addCalculationResult: (result) => set((state) => ({
    calculationResults: [...state.calculationResults, { ...result, id: generateId() }],
  })),
  clearCalculationResults: () => set({ calculationResults: [] }),

  addTimelineEvent: (event) => set((state) => ({
    timeline: [...state.timeline, { ...event, id: generateId() }],
  })),

  loadMockData: () => set({
    reviewItems: [...MOCK_REVIEW_ITEMS],
    calculationResults: [...MOCK_CALCULATION_RESULTS],
    timeline: [...MOCK_TIMELINE],
  }),

  resetData: () => set({
    reviewItems: [],
    calculationResults: [],
    timeline: [],
  }),
}));
