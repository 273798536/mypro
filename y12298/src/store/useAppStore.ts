import { create } from 'zustand'
import type { CorridorModel, Valve, InspectionRoute, ForbiddenZone, Conflict, WorkOrder, Annotation } from '@/types'
import { corridorData } from '@/data/corridor'
import { valveData } from '@/data/valves'
import { routeData } from '@/data/routes'
import { forbiddenZoneData } from '@/data/forbiddenZones'
import { conflictData, workOrderData } from '@/data/workorders'
import { detectDuplicateValves, detectForbiddenCrossing, detectModelMismatch } from '@/utils/conflictDetection'

type PanelTab = 'conflict' | 'workorder' | 'route' | 'valve'
type ActiveView = 'workbench' | 'route' | 'valve' | 'conflict' | 'evidence'
type ViewMode = 'top' | 'side' | 'free'

interface AppState {
  corridor: CorridorModel
  valves: Valve[]
  routes: InspectionRoute[]
  forbiddenZones: ForbiddenZone[]
  conflicts: Conflict[]
  workOrders: WorkOrder[]
  annotations: Annotation[]

  selectedValveId: string | null
  selectedRouteId: string | null
  selectedConflictId: string | null
  selectedWorkOrderId: string | null

  activePanelTab: PanelTab
  rightPanelOpen: boolean
  activeView: ActiveView
  viewMode: ViewMode
  showFailedPaths: boolean
  showForbiddenZones: boolean
  showAnnotations: boolean
  showValveLayer: boolean
  showRouteLayer: boolean
  showForbiddenLayer: boolean
  showAnnotationLayer: boolean

  setSelectedValve: (id: string | null) => void
  setSelectedRoute: (id: string | null) => void
  setSelectedConflict: (id: string | null) => void
  setSelectedWorkOrder: (id: string | null) => void
  setActivePanelTab: (tab: PanelTab) => void
  setRightPanelOpen: (open: boolean) => void
  setActiveView: (view: ActiveView) => void
  setViewMode: (mode: ViewMode) => void
  toggleFailedPaths: () => void
  toggleForbiddenZones: () => void
  toggleAnnotations: () => void
  toggleValveLayer: () => void
  toggleRouteLayer: () => void
  toggleForbiddenLayer: () => void
  toggleAnnotationLayer: () => void
  runConflictDetection: () => void
  addAnnotation: (annotation: Annotation) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  corridor: corridorData,
  valves: valveData,
  routes: routeData,
  forbiddenZones: forbiddenZoneData,
  conflicts: conflictData,
  workOrders: workOrderData,
  annotations: [],

  selectedValveId: null,
  selectedRouteId: null,
  selectedConflictId: null,
  selectedWorkOrderId: null,

  activePanelTab: 'conflict',
  rightPanelOpen: true,
  activeView: 'workbench',
  viewMode: 'free',
  showFailedPaths: true,
  showForbiddenZones: true,
  showAnnotations: true,
  showValveLayer: true,
  showRouteLayer: true,
  showForbiddenLayer: true,
  showAnnotationLayer: true,

  setSelectedValve: (id) => set({ selectedValveId: id }),
  setSelectedRoute: (id) => set({ selectedRouteId: id }),
  setSelectedConflict: (id) => set({ selectedConflictId: id }),
  setSelectedWorkOrder: (id) => set({ selectedWorkOrderId: id }),
  setActivePanelTab: (tab) => set({ activePanelTab: tab, rightPanelOpen: true }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleFailedPaths: () => set((s) => ({ showFailedPaths: !s.showFailedPaths })),
  toggleForbiddenZones: () => set((s) => ({ showForbiddenZones: !s.showForbiddenZones })),
  toggleAnnotations: () => set((s) => ({ showAnnotations: !s.showAnnotations })),
  toggleValveLayer: () => set((s) => ({ showValveLayer: !s.showValveLayer })),
  toggleRouteLayer: () => set((s) => ({ showRouteLayer: !s.showRouteLayer })),
  toggleForbiddenLayer: () => set((s) => ({ showForbiddenLayer: !s.showForbiddenLayer })),
  toggleAnnotationLayer: () => set((s) => ({ showAnnotationLayer: !s.showAnnotationLayer })),

  runConflictDetection: () => {
    const { valves, routes, corridor, forbiddenZones } = get()
    const duplicateGroups = detectDuplicateValves(valves)
    const forbiddenCrossings = detectForbiddenCrossing(routes, forbiddenZones)
    const mismatches = detectModelMismatch(corridor, valves)
    console.log('[冲突检测] 重号组:', duplicateGroups.length, '穿禁区:', forbiddenCrossings.length, '不一致:', mismatches.length)
  },

  addAnnotation: (annotation) => set((s) => ({ annotations: [...s.annotations, annotation] })),
}))
