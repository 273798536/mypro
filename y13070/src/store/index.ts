import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Station, CoordSystem, Point, PointVersion, Adjacency,
  MergeIssue, ReviewRound, Annotation, AnnotationNote,
  ScreenshotArchive, HandoverReport, HandoverItem, FilterState,
} from '@/types'
import { mockData } from '@/data/mockData'

interface ReviewStore {
  coordSystems: CoordSystem[]
  stations: Station[]
  points: Point[]
  pointVersions: PointVersion[]
  adjacencies: Adjacency[]
  mergeIssues: MergeIssue[]
  reviewRounds: ReviewRound[]
  annotations: Annotation[]
  annotationNotes: AnnotationNote[]
  screenshotArchives: ScreenshotArchive[]
  handoverReports: HandoverReport[]
  handoverItems: HandoverItem[]

  currentRoundId: string
  selectedPointId: string | null
  filter: FilterState
  dataVersion: number

  setCurrentRoundId: (id: string) => void
  setSelectedPointId: (id: string | null) => void
  setFilter: (filter: Partial<FilterState>) => void
  resetFilter: () => void

  addAnnotationNote: (annotationId: string, content: string, author: string) => void
  updateMergeIssueStatus: (id: string, status: MergeIssue['status']) => void
  updateHandoverItemStatus: (id: string, status: HandoverItem['verificationStatus'], verifiedBy: string) => void
  addHandoverReport: (title: string) => void

  setScreenshotDataUrl: (archiveId: string, dataUrl: string) => void
  setHandoverScreenshotDataUrl: (itemId: string, dataUrl: string) => void

  getFilteredPoints: () => Point[]
  getRoundAnnotations: () => Annotation[]
  getRoundStats: () => { total: number; normal: number; warning: number; error: number; processRate: number; coordSystemDist: Record<string, number> }
  getPointAdjacencies: (pointId: string) => Adjacency[]
  getPointMergeIssues: (pointId: string) => MergeIssue[]
  getAnnotationNotes: (annotationId: string) => AnnotationNote[]
  getAnnotationScreenshots: (annotationId: string) => ScreenshotArchive[]
  getPointVersions: (pointId: string) => PointVersion[]
}

const defaultFilter: FilterState = {
  coordSystemIds: [],
  stationIds: [],
  deviationRange: [0, 10],
  statuses: [],
}

export const useReviewStore = create<ReviewStore>()(
  persist(
    (set, get) => ({
      ...mockData,
      currentRoundId: mockData.reviewRounds[2].id,
      selectedPointId: null,
      filter: { ...defaultFilter },
      dataVersion: 1,

      setCurrentRoundId: (id) => set({ currentRoundId: id, selectedPointId: null }),

      setSelectedPointId: (id) => set({ selectedPointId: id }),

      setFilter: (partial) => set((s) => ({ filter: { ...s.filter, ...partial } })),

      resetFilter: () => set({ filter: { ...defaultFilter } }),

      addAnnotationNote: (annotationId, content, author) => set((s) => ({
        annotationNotes: [
          ...s.annotationNotes,
          {
            id: `note-${Date.now()}`,
            annotationId,
            content,
            author,
            createdAt: new Date().toISOString(),
          },
        ],
      })),

      updateMergeIssueStatus: (id, status) => set((s) => ({
        mergeIssues: s.mergeIssues.map((mi) => mi.id === id ? { ...mi, status } : mi),
      })),

      updateHandoverItemStatus: (id, status, verifiedBy) => set((s) => ({
        handoverItems: s.handoverItems.map((hi) =>
          hi.id === id
            ? { ...hi, verificationStatus: status, verifiedBy, verifiedAt: new Date().toISOString() }
            : hi
        ),
      })),

      addHandoverReport: (title) => set((s) => ({
        handoverReports: [
          ...s.handoverReports,
          { id: `hr-${Date.now()}`, title, createdAt: new Date().toISOString(), status: 'draft' },
        ],
      })),

      setScreenshotDataUrl: (archiveId, dataUrl) => set((s) => ({
        screenshotArchives: s.screenshotArchives.map((sa) =>
          sa.id === archiveId ? { ...sa, dataUrl } : sa
        ),
      })),

      setHandoverScreenshotDataUrl: (itemId, dataUrl) => set((s) => ({
        handoverItems: s.handoverItems.map((hi) =>
          hi.id === itemId ? { ...hi, screenshotDataUrl: dataUrl } : hi
        ),
      })),

      getFilteredPoints: () => {
        const { points, filter, adjacencies, currentRoundId, reviewRounds, annotations } = get()
        const round = reviewRounds.find((r) => r.id === currentRoundId)
        if (!round) return points

        const roundPointIds = new Set(
          annotations
            .filter((a) => a.roundId === currentRoundId)
            .map((a) => a.pointId)
        )

        let filtered = points

        if (filter.stationIds.length > 0) {
          filtered = filtered.filter((p) => filter.stationIds.includes(p.stationId))
        }
        if (filter.coordSystemIds.length > 0) {
          filtered = filtered.filter((p) => filter.coordSystemIds.includes(p.coordSystemId))
        }
        if (filter.statuses.length > 0) {
          filtered = filtered.filter((p) => filter.statuses.includes(p.status))
        }
        if (filter.deviationRange[0] > 0 || filter.deviationRange[1] < 10) {
          filtered = filtered.filter((p) => {
            const adjs = adjacencies.filter((a) => a.pointAId === p.id || a.pointBId === p.id)
            if (adjs.length === 0) return true
            const maxDev = Math.max(...adjs.map((a) => a.deviation))
            return maxDev >= filter.deviationRange[0] && maxDev <= filter.deviationRange[1]
          })
        }

        if (roundPointIds.size > 0) {
          filtered = filtered.filter((p) => roundPointIds.has(p.id) || p.status === 'normal')
        }

        return filtered
      },

      getRoundAnnotations: () => {
        const { annotations, currentRoundId } = get()
        return annotations.filter((a) => a.roundId === currentRoundId)
      },

      getRoundStats: () => {
        const filtered = get().getFilteredPoints()
        const { coordSystems } = get()
        const total = filtered.length
        const normal = filtered.filter((p) => p.status === 'normal').length
        const warning = filtered.filter((p) => p.status === 'warning').length
        const error = filtered.filter((p) => p.status === 'error').length
        const processRate = total > 0 ? (normal / total) * 100 : 0

        const coordSystemDist: Record<string, number> = {}
        coordSystems.forEach((cs) => { coordSystemDist[cs.name] = 0 })
        filtered.forEach((p) => {
          const cs = coordSystems.find((c) => c.id === p.coordSystemId)
          if (cs) coordSystemDist[cs.name] = (coordSystemDist[cs.name] || 0) + 1
        })

        return { total, normal, warning, error, processRate, coordSystemDist }
      },

      getPointAdjacencies: (pointId) => {
        return get().adjacencies.filter((a) => a.pointAId === pointId || a.pointBId === pointId)
      },

      getPointMergeIssues: (pointId) => {
        const adjs = get().getPointAdjacencies(pointId)
        const adjIds = new Set(adjs.map((a) => a.id))
        return get().mergeIssues.filter((mi) => adjIds.has(mi.adjacencyId))
      },

      getAnnotationNotes: (annotationId) => {
        return get().annotationNotes.filter((n) => n.annotationId === annotationId)
      },

      getAnnotationScreenshots: (annotationId) => {
        return get().screenshotArchives.filter((s) => s.annotationId === annotationId)
      },

      getPointVersions: (pointId) => {
        return get().pointVersions.filter((pv) => pv.pointId === pointId)
      },
    }),
    {
      name: 'cableway-review-store',
      partialize: (state) => ({
        annotations: state.annotations,
        annotationNotes: state.annotationNotes,
        screenshotArchives: state.screenshotArchives,
        mergeIssues: state.mergeIssues,
        handoverReports: state.handoverReports,
        handoverItems: state.handoverItems,
        pointVersions: state.pointVersions,
        currentRoundId: state.currentRoundId,
        filter: state.filter,
        dataVersion: state.dataVersion,
      }),
    }
  )
)
