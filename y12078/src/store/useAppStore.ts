import { create } from 'zustand'
import type { FilterState, Implant, CollisionIssue, SavedView, RenderMode, CameraState } from '@/types'
import { mockCase } from '@/data/mockCase'
import { mockImplants } from '@/data/mockImplants'
import { mockAnnotations } from '@/data/mockAnnotations'
import { mockIssues } from '@/data/mockIssues'
import { mockNotes } from '@/data/mockNotes'
import { loadViews, saveViewToStorage } from '@/utils/viewPersistence'

function filterImplants(implants: Implant[], filters: FilterState): Implant[] {
  return implants.filter((impl) => {
    const inSizeRange =
      impl.length_mm >= filters.sizeRange[0] &&
      impl.length_mm <= filters.sizeRange[1]
    const matchLaterality =
      filters.laterality === 'all' ||
      impl.laterality === filters.laterality ||
      impl.laterality === 'universal'
    return inSizeRange && matchLaterality
  })
}

function filterIssues(issues: CollisionIssue[], filters: FilterState): CollisionIssue[] {
  return issues.filter((issue) => filters.issueTypes.includes(issue.type))
}

interface AppState {
  filters: FilterState
  selectedImplantId: string | null
  selectedIssueId: string | null
  selectedAnnotationId: string | null
  caseData: typeof mockCase
  implants: Implant[]
  filteredImplants: Implant[]
  annotations: typeof mockAnnotations
  notes: typeof mockNotes
  issues: CollisionIssue[]
  filteredIssues: CollisionIssue[]
  savedViews: SavedView[]
  renderMode: RenderMode
  showBones: boolean
  showImplants: boolean
  showAnnotations: boolean
  cameraTarget: CameraState | null

  setFilters: (filters: Partial<FilterState>) => void
  selectImplant: (id: string | null) => void
  selectIssue: (id: string | null) => void
  selectAnnotation: (id: string | null) => void
  saveCurrentView: (name: string, camera: CameraState) => void
  loadView: (viewId: string) => void
  deleteView: (viewId: string) => void
  setRenderMode: (mode: RenderMode) => void
  toggleLayer: (layer: 'bones' | 'implants' | 'annotations') => void
  setCameraTarget: (target: CameraState | null) => void
}

const initialFilters: FilterState = {
  sizeRange: [0, 200],
  laterality: 'all',
  issueTypes: ['size_out_of_bound', 'side_mismatch', 'forbidden_zone_collision'],
}

export const useAppStore = create<AppState>((set, get) => ({
  filters: initialFilters,
  selectedImplantId: null,
  selectedIssueId: null,
  selectedAnnotationId: null,
  caseData: mockCase,
  implants: mockImplants,
  filteredImplants: filterImplants(mockImplants, initialFilters),
  annotations: mockAnnotations,
  notes: mockNotes,
  issues: mockIssues,
  filteredIssues: filterIssues(mockIssues, initialFilters),
  savedViews: loadViews(),
  renderMode: 'solid',
  showBones: true,
  showImplants: true,
  showAnnotations: true,
  cameraTarget: null,

  setFilters: (newFilters) =>
    set((state) => {
      const updated = { ...state.filters, ...newFilters }
      return {
        filters: updated,
        filteredImplants: filterImplants(state.implants, updated),
        filteredIssues: filterIssues(state.issues, updated),
      }
    }),

  selectImplant: (id) => set({ selectedImplantId: id }),

  selectIssue: (id) => {
    const state = get()
    const issue = state.issues.find((i) => i.id === id)
    if (issue) {
      const implant = state.implants.find((i) => i.id === issue.implantId)
      set({
        selectedIssueId: id,
        selectedImplantId: issue.implantId,
        selectedAnnotationId: issue.annotationId,
        cameraTarget: implant
          ? {
              position: [
                implant.position[0] + 2,
                implant.position[1] + 1,
                implant.position[2] + 3,
              ],
              target: implant.position,
            }
          : null,
      })
    } else {
      set({ selectedIssueId: null })
    }
  },

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  saveCurrentView: (name, camera) => {
    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name,
      cameraPosition: camera.position,
      cameraTarget: camera.target,
      createdAt: new Date().toLocaleString('zh-CN'),
    }
    set((state) => {
      const updated = [...state.savedViews, newView]
      saveViewToStorage(updated)
      return { savedViews: updated }
    })
  },

  loadView: (viewId) => {
    const view = get().savedViews.find((v) => v.id === viewId)
    if (view) {
      set({
        cameraTarget: {
          position: view.cameraPosition,
          target: view.cameraTarget,
        },
      })
    }
  },

  deleteView: (viewId) => {
    set((state) => {
      const updated = state.savedViews.filter((v) => v.id !== viewId)
      saveViewToStorage(updated)
      return { savedViews: updated }
    })
  },

  setRenderMode: (mode) => set({ renderMode: mode }),

  toggleLayer: (layer) =>
    set((state) => {
      const key = layer === 'bones' ? 'showBones' : layer === 'implants' ? 'showImplants' : 'showAnnotations'
      return { [key]: !state[key] } as Partial<AppState>
    }),

  setCameraTarget: (target) => set({ cameraTarget: target }),
}))
