import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  AppState,
  Layer,
  Annotation,
  TrajectoryPoint,
  HistoryEntry,
  ReviewSession,
  Settlement,
  SettlementDetail,
  Level,
  ExpectedAnnotation,
  BoundaryFailure,
  AnomalyType,
  Point,
  CorrectionZone,
  ExportData,
  ExportSummary
} from '../types'
import { sampleLevels } from '../data/sampleData'

export const useStore = create<AppState & {
  setCurrentLevel: (level: Level | null) => void
  initializeLevel: (level: Level) => void
  addAnnotation: (pointId: string, type: AnomalyType, comment: string) => void
  addCommentAnnotation: (annotation: { type: string; content: string; position: Point; author: string }) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  updateZoneStatus: (zoneId: string, status: CorrectionZone['status']) => void
  undo: () => void
  redo: () => void
  saveHistory: () => void
  selectPoint: (point: TrajectoryPoint | null) => void
  selectLayer: (layer: Layer | null) => void
  toggleLayerVisibility: (layerId: string) => void
  toggleLayerLock: (layerId: string) => void
  addLayer: (layer: Layer) => void
  removeLayer: (layerId: string) => void
  updateLayer: (layerId: string, updates: Partial<Layer>) => void
  setZoom: (zoom: number) => void
  setPan: (pan: Point) => void
  calculateSettlement: () => Settlement | null
  exportData: () => string
  completeLevel: () => void
  resetLevel: () => void
  resetSession: () => void
  recordBoundaryFailure: (failure: Omit<BoundaryFailure, 'id' | 'timestamp'>) => void
}>((set, get) => ({
  currentLevel: null,
  currentSession: null,
  levels: sampleLevels,
  layers: [],
  annotations: [],
  history: [],
  historyIndex: -1,
  settlement: null,
  selectedPoint: null,
  selectedLayer: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isCompleted: false,

  setCurrentLevel: (level) => {
    if (level) {
      get().initializeLevel(level)
    } else {
      set({
        currentLevel: null,
        currentSession: null,
        layers: [],
        annotations: [],
        history: [],
        historyIndex: -1,
        settlement: null,
        selectedPoint: null,
        selectedLayer: null,
        zoom: 1,
        pan: { x: 0, y: 0 },
        isCompleted: false
      })
    }
  },

  initializeLevel: (level: Level) => {
    const session: ReviewSession = {
      id: uuidv4(),
      levelId: level.id,
      startTime: Date.now(),
      status: 'in_progress',
      annotations: [],
      history: [],
      boundaryFailures: []
    }

    const trajectoryPoints = level.trajectoryData.length > 0
      ? level.trajectoryData
      : level.trajectoryPoints

    const trajectoryLayer: Layer = {
      id: uuidv4(),
      name: '轨迹图层',
      type: 'trajectory',
      visible: true,
      locked: false,
      points: trajectoryPoints,
      color: '#3b82f6',
      opacity: 1
    }

    const allBoundaryPoints: TrajectoryPoint[] = level.boundaries.flat().map((p, i) => ({
      id: `boundary-${i}`,
      x: p.x,
      y: p.y,
      timestamp: new Date().toISOString(),
      sourceNote: '边界坐标点',
      originalLineNumber: i + 1,
      isAnomaly: false
    }))

    const boundaryLayer: Layer = {
      id: uuidv4(),
      name: '边界图层',
      type: 'boundary',
      visible: true,
      locked: true,
      points: allBoundaryPoints,
      color: '#ef4444',
      opacity: 0.5
    }

    const annotationLayer: Layer = {
      id: uuidv4(),
      name: '标注图层',
      type: 'annotation',
      visible: true,
      locked: false,
      points: [],
      color: '#f59e0b',
      opacity: 1
    }

    set({
      currentLevel: level,
      currentSession: session,
      layers: [trajectoryLayer, boundaryLayer, annotationLayer],
      annotations: [],
      history: [],
      historyIndex: -1,
      settlement: null,
      selectedPoint: null,
      selectedLayer: null,
      zoom: 1,
      pan: { x: 0, y: 0 },
      isCompleted: false
    })
  },

  addAnnotation: (pointId: string, type: AnomalyType, comment: string) => {
    const state = get()
    const trajectoryLayer = state.layers.find(l => l.type === 'trajectory')
    const point = trajectoryLayer?.points.find(p => p.id === pointId)

    if (!point) return

    const annotation: Annotation = {
      id: uuidv4(),
      pointId,
      type,
      status: 'pending',
      comment,
      createdAt: Date.now(),
      createdBy: '学员',
      sourceReference: {
        lineNumber: point.originalLineNumber ?? point.rowNumber ?? 0,
        imageName: point.sourceImage ?? point.imageName,
        note: point.sourceNote
      }
    }

    const historyEntry: HistoryEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      action: 'annotate',
      annotationId: annotation.id,
      description: `标注点 #${annotation.sourceReference.lineNumber} 为 ${type}`
    }

    set(state => ({
      annotations: [...state.annotations, annotation],
      history: [...state.history.slice(0, state.historyIndex + 1), historyEntry],
      historyIndex: state.historyIndex + 1
    }))
  },

  addCommentAnnotation: (annotation) => {
    const state = get()
    const trajectoryLayer = state.layers.find(l => l.type === 'trajectory')
    if (!trajectoryLayer || trajectoryLayer.points.length === 0) return

    const nearestPoint = trajectoryLayer.points.reduce((nearest, p) => {
      const dist = Math.sqrt((p.x - annotation.position.x) ** 2 + (p.y - annotation.position.y) ** 2)
      const nearestDist = Math.sqrt((nearest.x - annotation.position.x) ** 2 + (nearest.y - annotation.position.y) ** 2)
      return dist < nearestDist ? p : nearest
    })

    get().addAnnotation(nearestPoint.id, 'boundary_violation', annotation.content)
  },

  updateAnnotation: (id: string, updates: Partial<Annotation>) => {
    set(state => {
      const annotation = state.annotations.find(a => a.id === id)
      if (!annotation) return state

      const historyEntry: HistoryEntry = {
        id: uuidv4(),
        timestamp: Date.now(),
        action: updates.status === 'rejected' ? 'reject' : 'confirm',
        annotationId: id,
        previousState: { ...annotation },
        description: `更新标注 #${annotation.sourceReference.lineNumber} 状态为 ${updates.status || annotation.status}`
      }

      return {
        annotations: state.annotations.map(a =>
          a.id === id ? { ...a, ...updates } : a
        ),
        history: [...state.history.slice(0, state.historyIndex + 1), historyEntry],
        historyIndex: state.historyIndex + 1
      }
    })
  },

  deleteAnnotation: (id: string) => {
    set(state => {
      const annotation = state.annotations.find(a => a.id === id)
      if (!annotation) return state

      const historyEntry: HistoryEntry = {
        id: uuidv4(),
        timestamp: Date.now(),
        action: 'annotate',
        annotationId: id,
        previousState: { ...annotation },
        description: `删除标注 #${annotation.sourceReference.lineNumber}`
      }

      return {
        annotations: state.annotations.filter(a => a.id !== id),
        history: [...state.history.slice(0, state.historyIndex + 1), historyEntry],
        historyIndex: state.historyIndex + 1
      }
    })
  },

  updateZoneStatus: (zoneId, status) => {
    set(state => {
      if (!state.currentLevel) return state
      const updatedZones = state.currentLevel.correctionZones.map(zone =>
        zone.id === zoneId ? { ...zone, status } : zone
      )

      const historyEntry: HistoryEntry = {
        id: uuidv4(),
        timestamp: Date.now(),
        action: status === 'rejected' ? 'reject' : 'confirm',
        annotationId: zoneId,
        description: `更新区域 ${zoneId} 状态为 ${status}`
      }

      return {
        currentLevel: {
          ...state.currentLevel,
          correctionZones: updatedZones
        },
        history: [...state.history.slice(0, state.historyIndex + 1), historyEntry],
        historyIndex: state.historyIndex + 1
      }
    })
  },

  saveHistory: () => set(state => {
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1
    }
  }),

  undo: () => {
    const state = get()
    if (state.historyIndex < 0) return

    const currentEntry = state.history[state.historyIndex]

    if (currentEntry.action === 'annotate' && currentEntry.previousState) {
      set(state => ({
        annotations: [...state.annotations, currentEntry.previousState as Annotation],
        historyIndex: state.historyIndex - 1
      }))
    } else if (currentEntry.action === 'annotate' && !currentEntry.previousState) {
      set(state => ({
        annotations: state.annotations.filter(a => a.id !== currentEntry.annotationId),
        historyIndex: state.historyIndex - 1
      }))
    } else if ((currentEntry.action === 'confirm' || currentEntry.action === 'reject') && currentEntry.previousState) {
      set(state => ({
        annotations: state.annotations.map(a =>
          a.id === currentEntry.annotationId ? currentEntry.previousState as Annotation : a
        ),
        historyIndex: state.historyIndex - 1
      }))
    }
  },

  redo: () => {
    const state = get()
    if (state.historyIndex >= state.history.length - 1) return

    const nextEntry = state.history[state.historyIndex + 1]

    if (nextEntry.action === 'annotate' && !nextEntry.previousState) {
      const exists = state.annotations.find(a => a.id === nextEntry.annotationId)
      if (exists) return
    }

    if (nextEntry.action === 'annotate' && nextEntry.previousState) {
      set(state => ({
        annotations: state.annotations.filter(a => a.id !== nextEntry.annotationId),
        historyIndex: state.historyIndex + 1
      }))
    } else if (nextEntry.action === 'annotate' && !nextEntry.previousState) {
      return
    } else if (nextEntry.action === 'confirm' || nextEntry.action === 'reject') {
      const annotation = state.annotations.find(a => a.id === nextEntry.annotationId)
      if (!annotation) return
      const newStatus = nextEntry.action === 'confirm' ? 'confirmed' : 'rejected'
      set(state => ({
        annotations: state.annotations.map(a =>
          a.id === nextEntry.annotationId ? { ...a, status: newStatus as Annotation['status'] } : a
        ),
        historyIndex: state.historyIndex + 1
      }))
    }
  },

  selectPoint: (point) => set({ selectedPoint: point }),
  selectLayer: (layer) => set({ selectedLayer: layer }),

  toggleLayerVisibility: (layerId) => set(state => ({
    layers: state.layers.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    )
  })),

  toggleLayerLock: (layerId) => set(state => ({
    layers: state.layers.map(l =>
      l.id === layerId ? { ...l, locked: !l.locked } : l
    )
  })),

  addLayer: (layer) => set(state => ({
    layers: [...state.layers, layer]
  })),

  removeLayer: (layerId) => set(state => ({
    layers: state.layers.filter(l => l.id !== layerId)
  })),

  updateLayer: (layerId, updates) => set(state => ({
    layers: state.layers.map(l =>
      l.id === layerId ? { ...l, ...updates } : l
    )
  })),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPan: (pan) => set({ pan }),

  calculateSettlement: () => {
    const state = get()
    if (!state.currentLevel || !state.currentSession) return null

    const expectedAnnotations = state.currentLevel.expectedAnnotations
    const details: SettlementDetail[] = []
    let correctAnnotations = 0
    let incorrectAnnotations = 0
    let missedAnnotations = 0

    const trajectoryLayer = state.layers.find(l => l.type === 'trajectory')

    expectedAnnotations.forEach((expected: ExpectedAnnotation) => {
      const userAnnotation = state.annotations.find(a => a.pointId === expected.pointId)

      if (!userAnnotation) {
        missedAnnotations++
        const point = trajectoryLayer?.points.find(p => p.id === expected.pointId)

        details.push({
          annotationId: '',
          pointId: expected.pointId,
          userAction: 'missed',
          expectedAction: 'confirm',
          isCorrect: false,
          sourceReference: {
            lineNumber: point?.originalLineNumber ?? point?.rowNumber ?? 0,
            imageName: point?.sourceImage ?? point?.imageName,
            note: point?.sourceNote
          }
        })
      } else {
        const isCorrect = userAnnotation.type === expected.type && userAnnotation.status !== 'rejected'
        if (isCorrect) {
          correctAnnotations++
        } else {
          incorrectAnnotations++
        }

        details.push({
          annotationId: userAnnotation.id,
          pointId: expected.pointId,
          userAction: userAnnotation.status === 'rejected' ? 'rejected' : 'confirmed',
          expectedAction: 'confirm',
          isCorrect,
          sourceReference: userAnnotation.sourceReference
        })
      }
    })

    state.annotations.forEach(ann => {
      const hasExpected = expectedAnnotations.find(e => e.pointId === ann.pointId)
      if (!hasExpected) {
        incorrectAnnotations++
        details.push({
          annotationId: ann.id,
          pointId: ann.pointId,
          userAction: ann.status === 'rejected' ? 'rejected' : 'confirmed',
          expectedAction: 'reject',
          isCorrect: false,
          sourceReference: ann.sourceReference
        })
      }
    })

    const totalPoints = trajectoryLayer?.points.length || 0
    const totalExpected = Math.max(expectedAnnotations.length, 1)
    const accuracy = (correctAnnotations / totalExpected) * 100

    const undoCount = state.history.filter(h => h.action === 'undo').length
    const redoCount = state.history.filter(h => h.action === 'redo').length

    const hasNeedsReview = state.annotations.some(a => a.status === 'needs_review')
    const hasPending = state.annotations.some(a => a.status === 'pending')
    const hasZonePending = state.currentLevel.correctionZones.some(z => z.status === 'pending')
    const hasBoundaryFailures = state.currentSession.boundaryFailures.length > 0

    let status: 'passed' | 'needs_review' | 'failed' = 'passed'
    if (accuracy < 60) {
      status = 'failed'
    } else if (accuracy < 80 || hasNeedsReview || hasPending || hasZonePending || hasBoundaryFailures) {
      status = 'needs_review'
    }

    const settlement: Settlement = {
      sessionId: state.currentSession.id,
      totalPoints,
      correctAnnotations,
      incorrectAnnotations,
      missedAnnotations,
      accuracy,
      timeSpent: Date.now() - state.currentSession.startTime,
      boundaryFailures: state.currentSession.boundaryFailures.length,
      undoCount,
      redoCount,
      status,
      details
    }

    set({ settlement, isCompleted: true })
    return settlement
  },

  exportData: () => {
    const state = get()
    if (!state.currentLevel) return ''

    const settlement = state.settlement || get().calculateSettlement()
    if (!settlement) return ''

    let summaryText = ''
    if (settlement.status === 'passed') {
      summaryText = '所有标注已确认且准确率达标，可直接使用'
    } else if (settlement.status === 'needs_review') {
      summaryText = '部分标注待确认或准确率未达到优秀标准，请联系安全培训师复核'
    } else {
      summaryText = '标注准确率未达标，请重新训练或咨询安全培训师'
    }

    const summary: ExportSummary = {
      status: settlement.status,
      levelId: state.currentLevel.id,
      levelName: state.currentLevel.name,
      totalPoints: settlement.totalPoints,
      annotations: state.annotations.length,
      accuracy: settlement.accuracy,
      exportTime: Date.now(),
      summaryText
    }

    const exportData: ExportData = {
      summary,
      annotations: state.annotations,
      trajectoryPoints: state.layers.find(l => l.type === 'trajectory')?.points || [],
      correctionZones: state.currentLevel.correctionZones,
      layers: state.layers,
      settlement
    }

    return JSON.stringify(exportData, null, 2)
  },

  completeLevel: () => {
    get().calculateSettlement()
  },

  resetLevel: () => {
    const state = get()
    if (!state.currentLevel) return
    const originalLevel = sampleLevels.find(l => l.id === state.currentLevel!.id)
    if (originalLevel) {
      get().initializeLevel({ ...originalLevel })
    }
  },

  resetSession: () => {
    const state = get()
    if (state.currentLevel) {
      get().initializeLevel(state.currentLevel)
    }
  },

  recordBoundaryFailure: (failure) => {
    set(state => {
      if (!state.currentSession) return state

      return {
        currentSession: {
          ...state.currentSession,
          boundaryFailures: [
            ...state.currentSession.boundaryFailures,
            {
              ...failure,
              id: uuidv4(),
              timestamp: Date.now()
            }
          ]
        }
      }
    })
  }
}))
