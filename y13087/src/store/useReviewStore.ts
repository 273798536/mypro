import { create } from 'zustand'
import type {
  LightPoint,
  DisplayCase,
  ReviewComment,
  AdjacentPair,
  LightPointStatus,
  ReviewStage,
} from '@/types'
import { lightPoints, displayCases, reviewComments, adjacentPairs } from '@/data/sceneData'

interface ReviewState {
  lightPoints: LightPoint[]
  displayCases: DisplayCase[]
  comments: ReviewComment[]
  adjacentPairs: AdjacentPair[]
  selectedLightPointId: string | null
  currentStage: ReviewStage
  filterStatus: LightPointStatus | 'all'
  filterGroup: string | 'all'
  searchQuery: string
  hoveredAdjacentPairId: string | null

  selectLightPoint: (id: string | null) => void
  setCurrentStage: (stage: ReviewStage) => void
  setFilterStatus: (status: LightPointStatus | 'all') => void
  setFilterGroup: (group: string | 'all') => void
  setSearchQuery: (query: string) => void
  setHoveredAdjacentPairId: (id: string | null) => void
  updateLightPointStatus: (id: string, status: LightPointStatus) => void
  addComment: (lightPointId: string, content: string, reviewer: string) => void
  resolveAdjacentPair: (id: string) => void

  getFilteredLightPoints: () => LightPoint[]
  getCommentsByLightPoint: (lightPointId: string) => ReviewComment[]
  getStatusCounts: () => Record<LightPointStatus, number>
  getSelectedLightPoint: () => LightPoint | null
  getAdjacentPairsByPoint: (pointId: string) => AdjacentPair[]
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  lightPoints,
  displayCases,
  comments: reviewComments,
  adjacentPairs,
  selectedLightPointId: null,
  currentStage: 'review',
  filterStatus: 'all',
  filterGroup: 'all',
  searchQuery: '',
  hoveredAdjacentPairId: null,

  selectLightPoint: (id) => set({ selectedLightPointId: id }),

  setCurrentStage: (stage) => set({ currentStage: stage }),

  setFilterStatus: (status) => set({ filterStatus: status }),

  setFilterGroup: (group) => set({ filterGroup: group }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setHoveredAdjacentPairId: (id) => set({ hoveredAdjacentPairId: id }),

  updateLightPointStatus: (id, status) =>
    set((state) => ({
      lightPoints: state.lightPoints.map((lp) =>
        lp.id === id ? { ...lp, status } : lp
      ),
    })),

  addComment: (lightPointId, content, reviewer) => {
    const { currentStage } = get()
    const newComment: ReviewComment = {
      id: `c-${Date.now()}`,
      lightPointId,
      stage: currentStage,
      content,
      reviewer,
      createdAt: new Date().toLocaleString('zh-CN'),
      statusAfter: get().lightPoints.find((lp) => lp.id === lightPointId)
        ?.status as LightPointStatus,
    }
    set((state) => ({
      comments: [...state.comments, newComment],
    }))
  },

  resolveAdjacentPair: (id) =>
    set((state) => ({
      adjacentPairs: state.adjacentPairs.map((ap) =>
        ap.id === id ? { ...ap, isResolved: true } : ap
      ),
    })),

  getFilteredLightPoints: () => {
    const { lightPoints, filterStatus, filterGroup, searchQuery } = get()
    return lightPoints.filter((lp) => {
      if (filterStatus !== 'all' && lp.status !== filterStatus) return false
      if (filterGroup !== 'all' && lp.groupId !== filterGroup) return false
      if (searchQuery && !lp.name.toLowerCase().includes(searchQuery.toLowerCase()))
        return false
      return true
    })
  },

  getCommentsByLightPoint: (lightPointId) => {
    const { comments, currentStage } = get()
    return comments
      .filter((c) => c.lightPointId === lightPointId && c.stage === currentStage)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  getStatusCounts: () => {
    const { lightPoints } = get()
    return lightPoints.reduce(
      (acc, lp) => {
        acc[lp.status]++
        return acc
      },
      { normal: 0, pending_material: 0, manual_review: 0 }
    )
  },

  getSelectedLightPoint: () => {
    const { lightPoints, selectedLightPointId } = get()
    return lightPoints.find((lp) => lp.id === selectedLightPointId) || null
  },

  getAdjacentPairsByPoint: (pointId) => {
    const { adjacentPairs } = get()
    return adjacentPairs.filter(
      (ap) => ap.pointAId === pointId || ap.pointBId === pointId
    )
  },
}))
