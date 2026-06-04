import { create } from 'zustand'
import type {
  CalibrationPoint,
  ScaleReference,
  Anomaly,
  EquipmentItem,
  GamePhase,
  CanvasSnapshot,
} from '@/types'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function detectAnomalies(
  points: CalibrationPoint[],
  scaleRefs: ScaleReference[],
  equipment: EquipmentItem[]
): Anomaly[] {
  const anomalies: Anomaly[] = []

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const dx = curr.x - prev.x
    const dy = curr.y - prev.y
    const prevDx = i >= 2 ? prev.x - points[i - 2].x : dx
    const prevDy = i >= 2 ? prev.y - points[i - 2].y : dy

    const flippedX = dx * prevDx < 0
    const flippedY = dy * prevDy < 0

    if (flippedX || flippedY) {
      const direction = flippedX && flippedY
        ? 'X轴与Y轴'
        : flippedX
          ? 'X轴'
          : 'Y轴'

      const explanation = `坐标翻转拦截说明：标注点"${curr.label}"的${direction}方向与相邻参考点"${prev.label}"相反。在手绘地图比例尺校对中，坐标翻转通常意味着该点可能被标反、参照物读数错误或设备安装方位不对。请先核对标注点"${curr.label}"的原始记录是否正确，如果原始记录无误，则需要补充该点的设备安装方位记录；如果原始记录有误，则应修改口径参数使坐标系方向一致。`

      anomalies.push({
        id: uid(),
        type: 'coordinate_flip',
        severity: flippedX && flippedY ? 'need_caliber_change' : 'need_material',
        pointId: curr.id,
        description: `${direction}方向翻转：${prev.label} → ${curr.label}`,
        plainExplanation: explanation,
        manualNote: curr.manualNote,
        timestamp: Date.now(),
      })
    }
  }

  for (const ref of scaleRefs) {
    const pixelDist = Math.sqrt(
      (ref.endX - ref.startX) ** 2 + (ref.endY - ref.startY) ** 2
    )
    if (pixelDist < 5 || pixelDist > 500) {
      anomalies.push({
        id: uid(),
        type: 'scale_mismatch',
        severity: 'need_caliber_change',
        pointId: ref.id,
        description: `比例尺参考线"${ref.realDistance}${ref.unit}"像素距离异常（${pixelDist.toFixed(1)}px）`,
        plainExplanation: `比例尺参考线异常说明：参考线标注的实距为${ref.realDistance}${ref.unit}，但画布上的像素距离为${pixelDist.toFixed(1)}像素，偏差超出容忍范围。这通常意味着口径参数需要调整，请重新测量参考线的实际距离并更新口径参数。`,
        manualNote: null,
        timestamp: Date.now(),
      })
    }
  }

  if (equipment.length === 0 && points.length > 0) {
    anomalies.push({
      id: uid(),
      type: 'missing_equipment',
      severity: 'need_material',
      pointId: '',
      description: '已有标注点但设备清单为空',
      plainExplanation: '设备清单缺失说明：画布上已有标注点，但尚未补录任何设备信息。设备清单是比例尺校对的重要依据，缺少设备信息可能导致校对结果无法验证。请在设备清单面板中补录使用的测量设备名称与规格。',
      manualNote: null,
      timestamp: Date.now(),
    })
  }

  return anomalies
}

function takeSnapshot(
  points: CalibrationPoint[],
  scaleRefs: ScaleReference[],
  anomalies: Anomaly[],
  equipment: EquipmentItem[],
  action: string
): CanvasSnapshot {
  return {
    points: JSON.parse(JSON.stringify(points)),
    scaleRefs: JSON.parse(JSON.stringify(scaleRefs)),
    anomalies: JSON.parse(JSON.stringify(anomalies)),
    equipment: JSON.parse(JSON.stringify(equipment)),
    timestamp: Date.now(),
    action,
  }
}

interface GameStore {
  phase: GamePhase
  round: number
  elapsedTime: number
  timerRef: ReturnType<typeof setInterval> | null
  points: CalibrationPoint[]
  scaleRefs: ScaleReference[]
  anomalies: Anomaly[]
  equipment: EquipmentItem[]
  snapshots: CanvasSnapshot[]
  undoStack: CanvasSnapshot[]
  redoStack: CanvasSnapshot[]

  start: () => void
  pause: () => void
  resume: () => void
  restart: () => void
  finish: () => void
  tick: () => void

  addPoint: (x: number, y: number, label: string) => void
  removePoint: (id: string) => void
  updatePointNote: (id: string, note: string) => void
  addScaleRef: (ref: Omit<ScaleReference, 'id'>) => void
  removeScaleRef: (id: string) => void

  addEquipment: (name: string, spec: string) => void
  removeEquipment: (id: string) => void

  undo: () => void
  redo: () => void

  loadFromStorage: () => void
  seedSampleData: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'idle',
  round: 1,
  elapsedTime: 0,
  timerRef: null,
  points: [],
  scaleRefs: [],
  anomalies: [],
  equipment: [],
  snapshots: [],
  undoStack: [],
  redoStack: [],

  start: () => {
    const state = get()
    if (state.phase !== 'idle') return
    const timerRef = setInterval(() => get().tick(), 1000)
    set({ phase: 'running', timerRef })
  },

  pause: () => {
    const state = get()
    if (state.phase !== 'running') return
    if (state.timerRef) clearInterval(state.timerRef)
    set({ phase: 'paused', timerRef: null })
  },

  resume: () => {
    const state = get()
    if (state.phase !== 'paused') return
    const timerRef = setInterval(() => get().tick(), 1000)
    set({ phase: 'running', timerRef })
  },

  restart: () => {
    const state = get()
    if (state.timerRef) clearInterval(state.timerRef)
    set({
      phase: 'idle',
      round: state.round + 1,
      elapsedTime: 0,
      timerRef: null,
      points: [],
      scaleRefs: [],
      anomalies: [],
      equipment: [],
      snapshots: [],
      undoStack: [],
      redoStack: [],
    })
  },

  finish: () => {
    const state = get()
    if (state.phase !== 'running' && state.phase !== 'paused') return
    if (state.timerRef) clearInterval(state.timerRef)
    set({ phase: 'settled', timerRef: null })
    setTimeout(saveToStorage, 0)
  },

  tick: () => {
    set((s) => ({ elapsedTime: s.elapsedTime + 1 }))
  },

  addPoint: (x, y, label) => {
    const state = get()
    if (state.phase !== 'running') return
    const snapshot = takeSnapshot(state.points, state.scaleRefs, state.anomalies, state.equipment, `添加标注点"${label}"`)
    const newPoint: CalibrationPoint = {
      id: uid(),
      x,
      y,
      label,
      coordinateReversed: false,
      manualNote: null,
    }
    const newPoints = [...state.points, newPoint]
    const newAnomalies = detectAnomalies(newPoints, state.scaleRefs, state.equipment)
    set({
      points: newPoints,
      anomalies: newAnomalies,
      snapshots: [...state.snapshots, snapshot],
      undoStack: [...state.undoStack, snapshot],
      redoStack: [],
    })
  },

  removePoint: (id) => {
    const state = get()
    if (state.phase !== 'running') return
    const point = state.points.find((p) => p.id === id)
    if (!point) return
    const snapshot = takeSnapshot(state.points, state.scaleRefs, state.anomalies, state.equipment, `删除标注点"${point.label}"`)
    const newPoints = state.points.filter((p) => p.id !== id)
    const newAnomalies = detectAnomalies(newPoints, state.scaleRefs, state.equipment)
    set({
      points: newPoints,
      anomalies: newAnomalies,
      snapshots: [...state.snapshots, snapshot],
      undoStack: [...state.undoStack, snapshot],
      redoStack: [],
    })
  },

  updatePointNote: (id, note) => {
    const state = get()
    const snapshot = takeSnapshot(state.points, state.scaleRefs, state.anomalies, state.equipment, `更新标注点备注`)
    const newPoints = state.points.map((p) =>
      p.id === id ? { ...p, manualNote: note } : p
    )
    const newAnomalies = state.anomalies.map((a) =>
      a.pointId === id ? { ...a, manualNote: note } : a
    )
    set({
      points: newPoints,
      anomalies: newAnomalies,
      snapshots: [...state.snapshots, snapshot],
      undoStack: [...state.undoStack, snapshot],
      redoStack: [],
    })
  },

  addScaleRef: (ref) => {
    const state = get()
    if (state.phase !== 'running') return
    const snapshot = takeSnapshot(state.points, state.scaleRefs, state.anomalies, state.equipment, `添加比例尺参考线（${ref.realDistance}${ref.unit}）`)
    const newRef: ScaleReference = { ...ref, id: uid() }
    const newScaleRefs = [...state.scaleRefs, newRef]
    const newAnomalies = detectAnomalies(state.points, newScaleRefs, state.equipment)
    set({
      scaleRefs: newScaleRefs,
      anomalies: newAnomalies,
      snapshots: [...state.snapshots, snapshot],
      undoStack: [...state.undoStack, snapshot],
      redoStack: [],
    })
  },

  removeScaleRef: (id) => {
    const state = get()
    if (state.phase !== 'running') return
    const snapshot = takeSnapshot(state.points, state.scaleRefs, state.anomalies, state.equipment, `删除比例尺参考线`)
    const newScaleRefs = state.scaleRefs.filter((r) => r.id !== id)
    const newAnomalies = detectAnomalies(state.points, newScaleRefs, state.equipment)
    set({
      scaleRefs: newScaleRefs,
      anomalies: newAnomalies,
      snapshots: [...state.snapshots, snapshot],
      undoStack: [...state.undoStack, snapshot],
      redoStack: [],
    })
  },

  addEquipment: (name, spec) => {
    const state = get()
    const snapshot = takeSnapshot(state.points, state.scaleRefs, state.anomalies, state.equipment, `补录设备"${name}"`)
    const item: EquipmentItem = { id: uid(), name, spec, addedAt: Date.now() }
    const newEquipment = [...state.equipment, item]
    const newAnomalies = detectAnomalies(state.points, state.scaleRefs, newEquipment)
    set({
      equipment: newEquipment,
      anomalies: newAnomalies,
      snapshots: [...state.snapshots, snapshot],
      undoStack: [...state.undoStack, snapshot],
      redoStack: [],
    })
  },

  removeEquipment: (id) => {
    const state = get()
    const snapshot = takeSnapshot(state.points, state.scaleRefs, state.anomalies, state.equipment, `移除设备`)
    const newEquipment = state.equipment.filter((e) => e.id !== id)
    const newAnomalies = detectAnomalies(state.points, state.scaleRefs, newEquipment)
    set({
      equipment: newEquipment,
      anomalies: newAnomalies,
      snapshots: [...state.snapshots, snapshot],
      undoStack: [...state.undoStack, snapshot],
      redoStack: [],
    })
  },

  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return
    const current = takeSnapshot(state.points, state.scaleRefs, state.anomalies, state.equipment, '当前状态')
    const prev = state.undoStack[state.undoStack.length - 1]
    set({
      points: prev.points,
      scaleRefs: prev.scaleRefs,
      anomalies: prev.anomalies,
      equipment: prev.equipment,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, current],
    })
  },

  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return
    const current = takeSnapshot(state.points, state.scaleRefs, state.anomalies, state.equipment, '当前状态')
    const next = state.redoStack[state.redoStack.length - 1]
    set({
      points: next.points,
      scaleRefs: next.scaleRefs,
      anomalies: next.anomalies,
      equipment: next.equipment,
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, current],
    })
  },

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem('calibration-game-state')
      if (!raw) return
      const data = JSON.parse(raw)
      set({
        phase: data.phase || 'idle',
        round: data.round || 1,
        elapsedTime: data.elapsedTime || 0,
        points: data.points || [],
        scaleRefs: data.scaleRefs || [],
        anomalies: data.anomalies || [],
        equipment: data.equipment || [],
        snapshots: data.snapshots || [],
        undoStack: [],
        redoStack: [],
      })
    } catch {
      /* ignore */
    }
  },

  seedSampleData: () => {
    const now = Date.now()
    const samplePoints: CalibrationPoint[] = [
      { id: 'sp1', x: 150, y: 200, label: 'A1', coordinateReversed: false, manualNote: null },
      { id: 'sp2', x: 350, y: 200, label: 'A2', coordinateReversed: false, manualNote: null },
      { id: 'sp3', x: 150, y: 350, label: 'A3-翻转', coordinateReversed: true, manualNote: '现场读数时发现标注方向不对，可能是安装时左右装反了' },
    ]
    const sampleScaleRefs: ScaleReference[] = [
      { id: 'sr1', startX: 150, startY: 200, endX: 350, endY: 200, realDistance: 50, unit: 'm' },
    ]
    const sampleEquipment: EquipmentItem[] = [
      { id: 'se1', name: '激光测距仪', spec: 'Leica DISTO D2', addedAt: now - 60000 },
      { id: 'se2', name: '全站仪', spec: 'Topcon ES-105C', addedAt: now - 30000 },
    ]
    const sampleAnomalies = detectAnomalies(samplePoints, sampleScaleRefs, sampleEquipment)
    const sampleSnapshots: CanvasSnapshot[] = [
      { points: [], scaleRefs: [], anomalies: [], equipment: [], timestamp: now - 120000, action: '开始校对' },
      { points: [samplePoints[0]], scaleRefs: [], anomalies: [], equipment: [], timestamp: now - 90000, action: '添加标注点"A1"' },
      { points: [samplePoints[0], samplePoints[1]], scaleRefs: [], anomalies: detectAnomalies([samplePoints[0], samplePoints[1]], [], []), equipment: [], timestamp: now - 70000, action: '添加标注点"A2"' },
      { points: [samplePoints[0], samplePoints[1]], scaleRefs: [sampleScaleRefs[0]], anomalies: detectAnomalies([samplePoints[0], samplePoints[1]], [sampleScaleRefs[0]], []), equipment: [], timestamp: now - 55000, action: '添加比例尺参考线（50m）' },
      { points: samplePoints, scaleRefs: [sampleScaleRefs[0]], anomalies: sampleAnomalies, equipment: [], timestamp: now - 40000, action: '添加标注点"A3-翻转"' },
      { points: samplePoints, scaleRefs: [sampleScaleRefs[0]], anomalies: detectAnomalies(samplePoints, [sampleScaleRefs[0]], [sampleEquipment[0]]), equipment: [sampleEquipment[0]], timestamp: now - 30000, action: '补录设备"激光测距仪"' },
      { points: samplePoints, scaleRefs: [sampleScaleRefs[0]], anomalies: sampleAnomalies, equipment: sampleEquipment, timestamp: now - 15000, action: '补录设备"全站仪"' },
    ]
    set({
      phase: 'settled',
      round: 1,
      elapsedTime: 186,
      timerRef: null,
      points: samplePoints,
      scaleRefs: sampleScaleRefs,
      anomalies: sampleAnomalies,
      equipment: sampleEquipment,
      snapshots: sampleSnapshots,
      undoStack: [],
      redoStack: [],
    })
    setTimeout(saveToStorage, 0)
  },
}))

const STORAGE_KEY = 'calibration-game-state'

function saveToStorage() {
  const state = useGameStore.getState()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      phase: state.phase,
      round: state.round,
      elapsedTime: state.elapsedTime,
      points: state.points,
      scaleRefs: state.scaleRefs,
      anomalies: state.anomalies,
      equipment: state.equipment,
      snapshots: state.snapshots,
    })
  )
}

setInterval(() => {
  const state = useGameStore.getState()
  if (state.phase === 'running' || state.phase === 'paused') {
    saveToStorage()
  }
}, 5000)
