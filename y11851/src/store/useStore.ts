import { create } from 'zustand'
import type {
  LayerVisibility,
  LayerOpacity,
  VersionFilter,
  ClippingState,
  Viewpoint,
  ConflictRecord,
} from '@/types'
import { conflicts as sampleConflicts } from '@/data/sampleData'

interface AppState {
  layerVisibility: LayerVisibility
  layerOpacity: LayerOpacity
  versionFilter: VersionFilter
  clipping: ClippingState
  viewpoints: Viewpoint[]
  selectedConflictId: string | null
  highlightedPipelineIds: string[]
  highlightedManholeIds: string[]
  conflicts: ConflictRecord[]
  showConflicts: boolean
  activePanel: 'layers' | 'conflicts' | 'coordination' | 'viewpoints' | null

  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void
  setLayerOpacity: (layer: keyof LayerOpacity, opacity: number) => void
  setVersionFilter: (type: keyof VersionFilter, version: string) => void
  setClipping: (clipping: Partial<ClippingState>) => void
  addViewpoint: (viewpoint: Viewpoint) => void
  removeViewpoint: (id: string) => void
  selectConflict: (id: string | null) => void
  setHighlightedPipelines: (ids: string[]) => void
  setHighlightedManholes: (ids: string[]) => void
  toggleShowConflicts: () => void
  setActivePanel: (panel: 'layers' | 'conflicts' | 'coordination' | 'viewpoints' | null) => void
}

export const useStore = create<AppState>((set) => ({
  layerVisibility: {
    gas: true,
    power: true,
    drainage: true,
    manholes: true,
    excavation: true,
    conflicts: true,
  },
  layerOpacity: {
    gas: 1,
    power: 1,
    drainage: 1,
    excavation: 0.3,
  },
  versionFilter: {
    gas: 'all',
    power: 'v1',
    drainage: 'v1',
  },
  clipping: {
    enabled: false,
    mode: 'horizontal',
    horizontalY: 0,
    verticalX: 0,
    verticalZ: 0,
  },
  viewpoints: [],
  selectedConflictId: null,
  highlightedPipelineIds: [],
  highlightedManholeIds: [],
  conflicts: sampleConflicts,
  showConflicts: false,
  activePanel: 'layers',

  setLayerVisibility: (layer, visible) =>
    set((s) => ({ layerVisibility: { ...s.layerVisibility, [layer]: visible } })),

  setLayerOpacity: (layer, opacity) =>
    set((s) => ({ layerOpacity: { ...s.layerOpacity, [layer]: opacity } })),

  setVersionFilter: (type, version) =>
    set((s) => ({ versionFilter: { ...s.versionFilter, [type]: version } })),

  setClipping: (partial) =>
    set((s) => ({ clipping: { ...s.clipping, ...partial } })),

  addViewpoint: (viewpoint) =>
    set((s) => ({ viewpoints: [...s.viewpoints, viewpoint] })),

  removeViewpoint: (id) =>
    set((s) => ({ viewpoints: s.viewpoints.filter((v) => v.id !== id) })),

  selectConflict: (id) =>
    set((s) => {
      if (id === null) {
        return { selectedConflictId: null, highlightedPipelineIds: [], highlightedManholeIds: [] }
      }
      const conflict = s.conflicts.find((c) => c.id === id)
      return {
        selectedConflictId: id,
        highlightedPipelineIds: conflict?.involvedPipelineIds ?? [],
        highlightedManholeIds: conflict?.involvedManholeIds ?? [],
      }
    }),

  setHighlightedPipelines: (ids) => set({ highlightedPipelineIds: ids }),
  setHighlightedManholes: (ids) => set({ highlightedManholeIds: ids }),

  toggleShowConflicts: () => set((s) => ({ showConflicts: !s.showConflicts })),

  setActivePanel: (panel) =>
    set((s) => ({ activePanel: s.activePanel === panel ? null : panel })),
}))
