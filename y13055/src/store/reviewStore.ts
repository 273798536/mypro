import { create } from 'zustand'
import type { InspectionPhoto, Material, ReviewRecord, FilterState, AnomalyType, ReviewStatus } from '@/types'
import { mockPhotos } from '@/data/mockPhotos'
import { mockMaterials } from '@/data/mockMaterials'
import { mockReviews } from '@/data/mockReviews'

interface ReviewStore {
  photos: InspectionPhoto[]
  materials: Material[]
  reviews: ReviewRecord[]
  filters: FilterState
  selectedPhotoId: string | null
  selectedReviewId: string | null

  setFilters: (partial: Partial<FilterState>) => void
  selectPhoto: (id: string | null) => void
  selectReview: (id: string | null) => void
  updateReviewStatus: (id: string, status: ReviewStatus, note?: string) => void
  addEvidence: (id: string, url: string) => void

  filteredPhotos: () => InspectionPhoto[]
  getReviewByPhotoId: (photoId: string) => ReviewRecord | undefined
  stats: () => { reviewed: number; pending: number; needEvidence: number }
  anomalyStats: () => Record<string, Record<string, number>>
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  photos: mockPhotos,
  materials: mockMaterials,
  reviews: mockReviews,
  filters: {
    floor: 'all',
    anomalyType: 'all',
    status: 'all',
    viewMode: 'plan'
  },
  selectedPhotoId: null,
  selectedReviewId: null,

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial }
    })),

  selectPhoto: (id) => set({ selectedPhotoId: id }),

  selectReview: (id) => set({ selectedReviewId: id }),

  updateReviewStatus: (id, status, note) =>
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === id
          ? { ...r, status, reviewNote: note ?? r.reviewNote, updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) }
          : r
      )
    })),

  addEvidence: (id, url) =>
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === id
          ? { ...r, evidenceUrl: url, updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) }
          : r
      )
    })),

  filteredPhotos: () => {
    const { photos, reviews, filters } = get()
    return photos.filter((photo) => {
      const review = reviews.find((r) => r.photoId === photo.id)
      if (!review) return true

      if (filters.floor !== 'all' && photo.floorNormalized !== filters.floor) {
        return false
      }
      if (filters.anomalyType !== 'all' && review.anomalyType !== filters.anomalyType) {
        return false
      }
      if (filters.status !== 'all' && review.status !== filters.status) {
        return false
      }
      return true
    })
  },

  getReviewByPhotoId: (photoId) => {
    const { reviews } = get()
    return reviews.find((r) => r.photoId === photoId)
  },

  stats: () => {
    const { reviews } = get()
    return {
      reviewed: reviews.filter((r) => r.status === 'reviewed').length,
      pending: reviews.filter((r) => r.status === 'pending').length,
      needEvidence: reviews.filter((r) => r.status === 'need_evidence').length
    }
  },

  anomalyStats: () => {
    const { photos, reviews } = get()
    const stats: Record<string, Record<string, number>> = {}

    reviews.forEach((review) => {
      const photo = photos.find((p) => p.id === review.photoId)
      if (!photo) return

      const floor = photo.floorNormalized
      const type = review.anomalyType as AnomalyType

      if (!stats[floor]) {
        stats[floor] = {}
      }
      if (!stats[floor][type]) {
        stats[floor][type] = 0
      }
      stats[floor][type]++
    })

    return stats
  }
}))
