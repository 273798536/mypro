import { create } from 'zustand'
import type {
  CadLayer,
  WindPoint,
  Anomaly,
  ViewSnapshot,
  ReviewRecord,
  CameraState,
  ReviewResult,
  AnomalyType,
} from '@/types'
import { mockLayers, mockPoints, mockAnomalies } from '@/data/mockData'

interface AppState {
  layers: CadLayer[]
  points: WindPoint[]
  anomalies: Anomaly[]
  selectedPointId: string | null
  hoveredPointId: string | null
  activeAnomalyFilter: AnomalyType | 'all'
  camera: CameraState
  snapshots: ViewSnapshot[]
  reviews: Record<string, ReviewRecord>
  showDetail: boolean
  _glRenderer: any
  setCamera: (camera: CameraState) => void
  toggleLayer: (layerId: string) => void
  selectPoint: (pointId: string | null) => void
  hoverPoint: (pointId: string | null) => void
  setAnomalyFilter: (filter: AnomalyType | 'all') => void
  saveSnapshot: (name: string) => void
  restoreSnapshot: (snapshotId: string) => void
  deleteSnapshot: (snapshotId: string) => void
  setReview: (pointId: string, result: ReviewResult, remark?: string) => void
  setShowDetail: (show: boolean) => void
  focusPoint: (pointId: string) => void
  exportReviewList: () => string
  batchSetReview: (pointIds: string[], result: ReviewResult) => void
  selectedPointIds: string[]
  toggleMultiSelect: (pointId: string) => void
  clearMultiSelect: () => void
  setGlRenderer: (gl: any) => void
  takeScreenshot: (name?: string) => void
}

const initialCamera: CameraState = {
  position: [30, 35, 60],
  target: [0, 2, 40],
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch (e) {}
  return fallback
}

function saveToStorage(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {}
}

export const useAppStore = create<AppState>((set, get) => ({
  layers: mockLayers,
  points: mockPoints,
  anomalies: mockAnomalies,
  selectedPointId: null,
  hoveredPointId: null,
  activeAnomalyFilter: 'all',
  camera: initialCamera,
  snapshots: loadFromStorage('wind_review_snapshots', []),
  reviews: loadFromStorage('wind_review_records', {}),
  showDetail: false,
  selectedPointIds: [],
  _glRenderer: null,

  setGlRenderer: (gl) => set({ _glRenderer: gl }),

  takeScreenshot: (name) => {
    const { _glRenderer, camera, layers } = get()
    if (!_glRenderer) {
      alert('3D 场景尚未就绪')
      return
    }
    _glRenderer.renderer.render(_glRenderer.scene, _glRenderer.camera)
    const dataUrl = _glRenderer.gl.domElement.toDataURL('image/png')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const w = _glRenderer.gl.domElement.width
    const h = _glRenderer.gl.domElement.height
    canvas.width = w
    canvas.height = h + 90
    ctx.fillStyle = '#0B2545'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(_glRenderer.gl.domElement, 0, 0)
    ctx.fillStyle = '#1B9AAA'
    ctx.font = 'bold 16px "JetBrains Mono", monospace'
    ctx.fillText('滨海步道风场空间复核 - 视图截图', 20, h + 30)
    ctx.fillStyle = '#8D99AE'
    ctx.font = '12px "JetBrains Mono", monospace'
    ctx.fillText(
      `相机位置: (${camera.position[0].toFixed(1)}, ${camera.position[1].toFixed(1)}, ${camera.position[2].toFixed(1)})`,
      20,
      h + 50
    )
    ctx.fillText(
      `目标点: (${camera.target[0].toFixed(1)}, ${camera.target[1].toFixed(1)}, ${camera.target[2].toFixed(1)})`,
      20,
      h + 68
    )
    const visibleLayers = layers.filter((l) => l.visible).map((l) => l.name).join(', ')
    ctx.fillText(`可见图层: ${visibleLayers}`, 20, h + 86)
    ctx.fillStyle = '#FF6B35'
    ctx.fillText(
      `生成时间: ${new Date().toLocaleString('zh-CN')}`,
      canvas.width - 260,
      h + 30
    )

    const link = document.createElement('a')
    const fname =
      name && name.trim()
        ? `风场截图_${name.trim()}.png`
        : `风场截图_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`
    link.download = fname
    link.href = canvas.toDataURL('image/png')
    link.click()
  },

  setCamera: (camera) => set({ camera }),

  toggleLayer: (layerId) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    })),

  selectPoint: (pointId) => set({ selectedPointId: pointId, showDetail: !!pointId }),
  hoverPoint: (pointId) => set({ hoveredPointId: pointId }),
  setAnomalyFilter: (filter) => set({ activeAnomalyFilter: filter }),
  setShowDetail: (show) => set({ showDetail: show }),

  focusPoint: (pointId) => {
    const pt = get().points.find((p) => p.id === pointId)
    if (pt) {
      set({
        camera: {
          position: [pt.x + 10, pt.y + 8, pt.z + 10],
          target: [pt.x, pt.y, pt.z],
        },
        selectedPointId: pointId,
        showDetail: true,
      })
    }
  },

  saveSnapshot: (name) => {
    const { camera, layers } = get()
    const snap: ViewSnapshot = {
      id: `SNAP-${Date.now()}`,
      name,
      camera,
      layers: Object.fromEntries(layers.map((l) => [l.id, l.visible])),
      createdAt: new Date().toISOString(),
    }
    const snapshots = [...get().snapshots, snap]
    saveToStorage('wind_review_snapshots', snapshots)
    set({ snapshots })
  },

  restoreSnapshot: (snapshotId) => {
    const snap = get().snapshots.find((s) => s.id === snapshotId)
    if (!snap) return
    set((state) => ({
      camera: snap.camera,
      layers: state.layers.map((l) => ({
        ...l,
        visible: snap.layers[l.id] ?? l.visible,
      })),
    }))
  },

  deleteSnapshot: (snapshotId) => {
    const snapshots = get().snapshots.filter((s) => s.id !== snapshotId)
    saveToStorage('wind_review_snapshots', snapshots)
    set({ snapshots })
  },

  setReview: (pointId, result, remark = '') => {
    const record: ReviewRecord = {
      pointId,
      result,
      remark,
      updatedAt: new Date().toISOString(),
    }
    const reviews = { ...get().reviews, [pointId]: record }
    saveToStorage('wind_review_records', reviews)
    set({ reviews })
  },

  batchSetReview: (pointIds, result) => {
    const reviews = { ...get().reviews }
    pointIds.forEach((id) => {
      reviews[id] = {
        pointId: id,
        result,
        remark: '',
        updatedAt: new Date().toISOString(),
      }
    })
    saveToStorage('wind_review_records', reviews)
    set({ reviews })
  },

  toggleMultiSelect: (pointId) =>
    set((s) => ({
      selectedPointIds: s.selectedPointIds.includes(pointId)
        ? s.selectedPointIds.filter((id) => id !== pointId)
        : [...s.selectedPointIds, pointId],
    })),

  clearMultiSelect: () => set({ selectedPointIds: [] }),

  exportReviewList: () => {
    const { points, reviews, layers, anomalies } = get()
    const lines: string[] = []
    lines.push('滨海步道风场空间复核清单')
    lines.push('导出时间: ' + new Date().toLocaleString('zh-CN'))
    lines.push('='.repeat(80))
    lines.push('')
    lines.push('【需补料清单】')
    const supply = points.filter((p) => reviews[p.id]?.result === 'supply')
    if (supply.length === 0) lines.push('  (无)')
    supply.forEach((p) => {
      const layer = layers.find((l) => l.id === p.layerId)
      const anom = anomalies.filter((a) => a.pointId === p.id)
      lines.push(
        `  * ${p.id} [${p.type}] 位置(X=${p.x.toFixed(2)},Y=${p.y.toFixed(2)},Z=${p.z.toFixed(2)})`
      )
      lines.push(`    图层来源: ${layer?.name} (${layer?.sourceFile} 行${p.cadLineNumber})`)
      anom.forEach((a) => lines.push(`    异常: ${a.description}`))
      if (reviews[p.id].remark) lines.push(`    备注: ${reviews[p.id].remark}`)
    })
    lines.push('')
    lines.push('【可放行清单】')
    const pass = points.filter((p) => reviews[p.id]?.result === 'pass')
    if (pass.length === 0) lines.push('  (无)')
    pass.forEach((p) => {
      const layer = layers.find((l) => l.id === p.layerId)
      lines.push(
        `  ✓ ${p.id} [${p.type}] 图层: ${layer?.name} 行${p.cadLineNumber}`
      )
    })
    lines.push('')
    lines.push('【待确认清单】')
    const pending = points.filter(
      (p) => !reviews[p.id] || reviews[p.id].result === 'pending'
    )
    if (pending.length === 0) lines.push('  (无)')
    pending.forEach((p) => {
      const layer = layers.find((l) => l.id === p.layerId)
      lines.push(
        `  ? ${p.id} [${p.type}] 状态=${p.status} 图层: ${layer?.name} 行${p.cadLineNumber}`
      )
    })
    return lines.join('\n')
  },
}))
