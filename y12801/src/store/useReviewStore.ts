import { create } from 'zustand'
import type { ReviewRecord, AnomalyReview } from '@/types'
import { mockReviewRecords, mockAnomalyReviews } from '@/data/mockData'

interface ReviewState {
  reviewRecords: ReviewRecord[]
  anomalyReviews: AnomalyReview[]
  selectedClusterId: string | null
  selectedSampleIds: string[]
  highlightedSampleId: string | null

  selectCluster: (clusterId: string | null) => void
  selectSamples: (sampleIds: string[]) => void
  highlightSample: (sampleId: string | null) => void
  addReviewRecord: (record: ReviewRecord) => void
  addAnomalyReview: (review: AnomalyReview) => void
  approveAnomalyReview: (reviewId: string, approver: string) => void
  rejectAnomalyReview: (reviewId: string, approver: string) => void
  getReviewsByBatchId: (batchId: string) => ReviewRecord[]
  getAnomalyReviewByBatchId: (batchId: string) => AnomalyReview[]
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviewRecords: mockReviewRecords,
  anomalyReviews: mockAnomalyReviews,
  selectedClusterId: null,
  selectedSampleIds: [],
  highlightedSampleId: null,

  selectCluster: (clusterId) => set({ selectedClusterId: clusterId }),

  selectSamples: (sampleIds) => set({ selectedSampleIds: sampleIds }),

  highlightSample: (sampleId) => set({ highlightedSampleId: sampleId }),

  addReviewRecord: (record) =>
    set((state) => ({
      reviewRecords: [...state.reviewRecords, record],
    })),

  addAnomalyReview: (review) =>
    set((state) => ({
      anomalyReviews: [...state.anomalyReviews, review],
    })),

  approveAnomalyReview: (reviewId, approver) =>
    set((state) => ({
      anomalyReviews: state.anomalyReviews.map((r) =>
        r.id === reviewId
          ? { ...r, approvalStatus: 'approved' as const, approver, approvedAt: new Date().toISOString() }
          : r
      ),
    })),

  rejectAnomalyReview: (reviewId, approver) =>
    set((state) => ({
      anomalyReviews: state.anomalyReviews.map((r) =>
        r.id === reviewId
          ? { ...r, approvalStatus: 'rejected' as const, approver, approvedAt: new Date().toISOString() }
          : r
      ),
    })),

  getReviewsByBatchId: (batchId) =>
    get().reviewRecords.filter((r) => r.batchId === batchId),

  getAnomalyReviewByBatchId: (batchId) =>
    get().anomalyReviews.filter((r) => r.batchId === batchId),
}))
