import { create } from 'zustand'
import type { Bar, Fixture, Collision, Annotation, SupplementMaterial, ScreenshotMark, BarFrame, FilterState } from '@/types'
import { mockBars, mockFixtures, mockCollisions, mockAnnotations, mockSupplements, mockScreenshots, mockBarFrames } from '@/data/mockData'

interface AppState {
  bars: Bar[]
  fixtures: Fixture[]
  collisions: Collision[]
  annotations: Annotation[]
  supplements: SupplementMaterial[]
  screenshots: ScreenshotMark[]
  barFrames: BarFrame[]

  currentFrame: number
  totalFrames: number
  selectedObjectId: string | null
  selectedCollisionId: string | null
  filter: FilterState
  sidebarCollapsed: boolean

  setCurrentFrame: (frame: number) => void
  setSelectedObjectId: (id: string | null) => void
  setSelectedCollisionId: (id: string | null) => void
  setFilter: (filter: Partial<FilterState>) => void
  toggleSidebar: () => void

  addAnnotation: (annotation: Annotation) => void
  addSupplement: (supplement: SupplementMaterial) => void
  addScreenshot: (screenshot: ScreenshotMark) => void
  updateCollisionStatus: (collisionId: string, status: Collision['status']) => void
  updateScreenshotLabel: (screenshotId: string, labelType: ScreenshotMark['labelType']) => void
  setScreenshotImageData: (screenshotId: string, imageData: string) => void

  getBarById: (id: string) => Bar | undefined
  getFixturesByBarId: (barId: string) => Fixture[]
  getCollisionsByObjectId: (objectId: string) => Collision[]
  getAnnotationsByCollisionId: (collisionId: string) => Annotation[]
  getSupplementsByAnnotationId: (annotationId: string) => SupplementMaterial[]
  getCollisionForObjectAtFrame: (objectId: string, frame: number) => Collision[]
  getBarPositionAtFrame: (barId: string, frame: number) => number
}

export const useStore = create<AppState>((set, get) => ({
  bars: mockBars,
  fixtures: mockFixtures,
  collisions: mockCollisions,
  annotations: mockAnnotations,
  supplements: mockSupplements,
  screenshots: mockScreenshots,
  barFrames: mockBarFrames,

  currentFrame: 0,
  totalFrames: 10,
  selectedObjectId: null,
  selectedCollisionId: null,
  filter: { collisionStatus: 'all', objectType: 'all' },
  sidebarCollapsed: false,

  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  setSelectedObjectId: (id) => set({ selectedObjectId: id, selectedCollisionId: null }),
  setSelectedCollisionId: (id) => set({ selectedCollisionId: id }),
  setFilter: (partial) => set((s) => ({ filter: { ...s.filter, ...partial } })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  addAnnotation: (annotation) => set((s) => ({ annotations: [...s.annotations, annotation] })),
  addSupplement: (supplement) => set((s) => ({ supplements: [...s.supplements, supplement] })),
  addScreenshot: (screenshot) => set((s) => ({ screenshots: [...s.screenshots, screenshot] })),
  updateCollisionStatus: (collisionId, status) =>
    set((s) => ({
      collisions: s.collisions.map((c) => (c.id === collisionId ? { ...c, status } : c)),
    })),
  updateScreenshotLabel: (screenshotId, labelType) =>
    set((s) => ({
      screenshots: s.screenshots.map((sc) => (sc.id === screenshotId ? { ...sc, labelType } : sc)),
    })),
  setScreenshotImageData: (screenshotId, imageData) =>
    set((s) => ({
      screenshots: s.screenshots.map((sc) => (sc.id === screenshotId ? { ...sc, imageData } : sc)),
    })),

  getBarById: (id) => get().bars.find((b) => b.id === id),
  getFixturesByBarId: (barId) => get().fixtures.filter((f) => f.barId === barId),
  getCollisionsByObjectId: (objectId) =>
    get().collisions.filter((c) => c.objectAId === objectId || c.objectBId === objectId),
  getAnnotationsByCollisionId: (collisionId) =>
    get().annotations.filter((a) => a.collisionId === collisionId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
  getSupplementsByAnnotationId: (annotationId) =>
    get().supplements.filter((s) => s.annotationId === annotationId).sort((a, b) => new Date(a.timestamp as string).getTime() - new Date(b.timestamp as string).getTime()),
  getCollisionForObjectAtFrame: (objectId, frame) =>
    get().collisions.filter(
      (c) => (c.objectAId === objectId || c.objectBId === objectId) && c.frameIndex === frame
    ),
  getBarPositionAtFrame: (barId, frame) => {
    const frameData = get().barFrames.find((f) => f.barId === barId && f.frameIndex === frame)
    if (frameData) return frameData.positionY
    const bar = get().bars.find((b) => b.id === barId)
    return bar ? bar.positionY : 0
  },
}))
