import { create } from 'zustand'
import type { CorridorModel, Valve, InspectionRoute, ForbiddenZone, Conflict, WorkOrder, Annotation, CorridorNode, RoutePoint } from '@/types'
import { corridorData } from '@/data/corridor'
import { valveData } from '@/data/valves'
import { routeData } from '@/data/routes'
import { forbiddenZoneData } from '@/data/forbiddenZones'
import { conflictData, workOrderData } from '@/data/workorders'
import { detectDuplicateValves, detectForbiddenCrossing, detectModelMismatch } from '@/utils/conflictDetection'

type PanelTab = 'conflict' | 'workorder' | 'route' | 'valve'
type ActiveView = 'workbench' | 'route' | 'valve' | 'conflict' | 'evidence'
type ViewMode = 'top' | 'side' | 'free'
type ToolMode = 'select' | 'draw_route' | 'annotate_text' | 'annotate_arrow' | 'measure'
type CompareMode = 'none' | 'selecting' | 'comparing'

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

  toolMode: ToolMode
  isDrawingRoute: boolean
  draftRoutePoints: RoutePoint[]
  draftRouteName: string

  compareMode: CompareMode
  compareRouteId1: string | null
  compareRouteId2: string | null

  screenshotOverlay: boolean
  latestScreenshot: string | null

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

  setToolMode: (mode: ToolMode) => void
  startDrawingRoute: () => void
  cancelDrawingRoute: () => void
  addRoutePoint: (node: CorridorNode) => boolean
  removeRoutePoint: (index: number) => void
  setDraftRouteName: (name: string) => void
  saveDraftRoute: () => { success: boolean; route: InspectionRoute | null; errors: string[] }
  rollbackRoute: (routeId: string) => boolean
  deleteRoute: (routeId: string) => boolean

  startCompare: () => void
  selectCompareRoute: (routeId: string) => void
  cancelCompare: () => void

  takeScreenshot: (canvas: HTMLCanvasElement) => void
  clearScreenshot: () => void

  validateDraftRoute: () => string[]
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

  toolMode: 'select',
  isDrawingRoute: false,
  draftRoutePoints: [],
  draftRouteName: '',

  compareMode: 'none',
  compareRouteId1: null,
  compareRouteId2: null,

  screenshotOverlay: false,
  latestScreenshot: null,

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

  setToolMode: (mode) => {
    const { cancelDrawingRoute, cancelCompare } = get()
    if (mode !== 'draw_route') cancelDrawingRoute()
    if (mode !== 'select') cancelCompare()
    set({ toolMode: mode })
  },

  startDrawingRoute: () => {
    set({
      toolMode: 'draw_route',
      isDrawingRoute: true,
      draftRoutePoints: [],
      draftRouteName: `新路线 v${get().routes.length + 1}.0`,
    })
  },

  cancelDrawingRoute: () => {
    const state = get()
    if (state.isDrawingRoute) {
      set({
        toolMode: 'select',
        isDrawingRoute: false,
        draftRoutePoints: [],
        draftRouteName: '',
      })
    }
  },

  addRoutePoint: (node) => {
    const state = get()
    if (!state.isDrawingRoute) return false

    const exists = state.draftRoutePoints.some((p) => p.nodeId === node.id)
    if (exists) return false

    const newPoint: RoutePoint = {
      nodeId: node.id,
      position: node.position,
    }
    set({ draftRoutePoints: [...state.draftRoutePoints, newPoint] })
    return true
  },

  removeRoutePoint: (index) => {
    const state = get()
    const newPoints = state.draftRoutePoints.filter((_, i) => i !== index)
    set({ draftRoutePoints: newPoints })
  },

  setDraftRouteName: (name) => set({ draftRouteName: name }),

  validateDraftRoute: () => {
    const errors: string[] = []
    const state = get()

    if (!state.draftRouteName.trim()) {
      errors.push('路线名称不能为空')
    }

    if (state.draftRoutePoints.length < 2) {
      errors.push('路线至少需要2个节点')
    }

    const pointTags = state.draftRoutePoints.map((p) => p.nodeId)
    const duplicateNodes = pointTags.filter((tag, i) => pointTags.indexOf(tag) !== i)
    if (duplicateNodes.length > 0) {
      errors.push(`存在重复节点: ${duplicateNodes.join(', ')}`)
    }

    const valveIds = state.draftRoutePoints
      .filter((p) => state.valves.some((v) => v.nodeId === p.nodeId))
      .map((p) => state.valves.find((v) => v.nodeId === p.nodeId)?.tagNumber)

    const duplicateValves = valveIds.filter((tag, i) => valveIds.indexOf(tag) !== i)
    if (duplicateValves.length > 0) {
      errors.push(`警告: 路线包含重号阀门 ${duplicateValves.join(', ')}，保存后将标记为失败`)
    }

    return errors
  },

  saveDraftRoute: () => {
    const state = get()
    const errors = state.validateDraftRoute()

    const criticalErrors = errors.filter((e) => !e.startsWith('警告:'))
    if (criticalErrors.length > 0) {
      return { success: false, route: null, errors: criticalErrors }
    }

    const hasWarning = errors.some((e) => e.startsWith('警告:'))

    const newVersion = `V${state.routes.length + 1}.0-DRAFT`
    const newId = `r${state.routes.length + 1}`

    const hasDuplicateValve = state.draftRoutePoints.some((p) => {
      const valve = state.valves.find((v) => v.nodeId === p.nodeId)
      return valve?.status === 'duplicate'
    })

    const crossesForbidden = state.draftRoutePoints.some((point) =>
      state.forbiddenZones.some((zone) => {
        const [px, , pz] = point.position
        const xs = zone.boundary.map((b) => b[0])
        const zs = zone.boundary.map((b) => b[2])
        return (
          px >= Math.min(...xs) &&
          px <= Math.max(...xs) &&
          pz >= Math.min(...zs) &&
          pz <= Math.max(...zs)
        )
      }),
    )

    const newRoute: InspectionRoute = {
      id: newId,
      version: newVersion,
      name: state.draftRouteName,
      points: state.draftRoutePoints.map((p, i) => ({
        ...p,
        arrivalTime: `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${String((i % 2) * 15).padStart(2, '0')}`,
        stayDuration: i === 0 ? 5 : 10,
      })),
      status: hasDuplicateValve || crossesForbidden ? 'failed' : 'draft',
      failedReason: hasDuplicateValve
        ? '路线包含重号阀门'
        : crossesForbidden
          ? '路线穿越辐射控制区'
          : undefined,
      creator: '当前用户',
      createdAt: new Date().toISOString(),
      remark: hasDuplicateValve || crossesForbidden ? '自动检测失败，请查看失败原因' : '新创建的巡检路线',
      workOrderId: hasDuplicateValve ? 'WO-2026-0038' : undefined,
    }

    set({
      routes: [...state.routes, newRoute],
      toolMode: 'select',
      isDrawingRoute: false,
      draftRoutePoints: [],
      draftRouteName: '',
      selectedRouteId: newId,
    })

    return { success: true, route: newRoute, errors: hasWarning ? errors : [] }
  },

  rollbackRoute: (routeId) => {
    const state = get()
    const route = state.routes.find((r) => r.id === routeId)
    if (!route || route.status === 'active') return false

    const newRoutes = state.routes.map((r) => {
      if (r.id === routeId) {
        return { ...r, status: 'active' as const }
      }
      if (r.status === 'active') {
        return { ...r, status: 'deprecated' as const }
      }
      return r
    })

    set({ routes: newRoutes })
    return true
  },

  deleteRoute: (routeId) => {
    const state = get()
    const route = state.routes.find((r) => r.id === routeId)
    if (!route) return false

    if (route.status === 'active') {
      return false
    }

    set({
      routes: state.routes.filter((r) => r.id !== routeId),
      selectedRouteId: state.selectedRouteId === routeId ? null : state.selectedRouteId,
    })
    return true
  },

  startCompare: () => {
    const state = get()
    set({
      compareMode: 'selecting',
      compareRouteId1: state.selectedRouteId,
      compareRouteId2: null,
      toolMode: 'select',
    })
  },

  selectCompareRoute: (routeId) => {
    const state = get()
    if (!state.compareRouteId1) {
      set({ compareRouteId1: routeId })
    } else if (!state.compareRouteId2 && routeId !== state.compareRouteId1) {
      set({ compareRouteId2: routeId, compareMode: 'comparing' })
    }
  },

  cancelCompare: () => {
    set({
      compareMode: 'none',
      compareRouteId1: null,
      compareRouteId2: null,
    })
  },

  takeScreenshot: (canvas) => {
    try {
      const dataUrl = canvas.toDataURL('image/png')
      set({ latestScreenshot: dataUrl, screenshotOverlay: true })
    } catch (e) {
      console.error('截图失败:', e)
    }
  },

  clearScreenshot: () => set({ screenshotOverlay: false, latestScreenshot: null }),
}))
