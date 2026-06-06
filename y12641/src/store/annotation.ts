import { create } from 'zustand'
import type { Placement, HistoryAction, ReportData, Level, Cargo, ForbiddenZone } from '../types'
import { getLevelById } from '../data/levels'

interface AnnotationState {
  currentLevelId: string | null
  currentLevel: Level | null
  placements: Placement[]
  history: HistoryAction[]
  gridSnap: boolean
  selectedCargoId: string | null
  startTime: number | null
  undoCount: number
  restartCount: number
  boundaryFailures: number
  collisionEvents: number
  gridSnapChanges: number
  resolvedIssueIds: string[]
  lastCollisionDiff: { before: Placement | null; after: Placement | null } | null

  setLevel: (levelId: string) => void
  selectCargo: (cargoId: string | null) => void
  toggleGridSnap: () => void
  placeCargo: (cargoId: string, x: number, y: number) => { success: boolean; message?: string }
  undo: () => void
  restart: () => void
  removePlacement: (placementId: string) => void
  markIssueResolved: (issueId: string) => void
  generateReport: () => ReportData | null
  resetAll: () => void
}

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()

const checkCollision = (
  newPlacement: Placement,
  allPlacements: Placement[],
  cargoWidth: number,
  cargoHeight: number
): Placement | null => {
  for (const p of allPlacements) {
    if (p.id === newPlacement.id || p.cargoId === newPlacement.cargoId) continue
    const pw = cargoWidth
    const ph = cargoHeight
    if (
      newPlacement.x < p.x + pw &&
      newPlacement.x + cargoWidth > p.x &&
      newPlacement.y < p.y + ph &&
      newPlacement.y + cargoHeight > p.y
    ) {
      return p
    }
  }
  return null
}

const checkBoundary = (
  x: number,
  y: number,
  w: number,
  h: number,
  deckW: number,
  deckH: number,
  forbiddenZones: ForbiddenZone[]
): { ok: boolean; reason?: string; zoneName?: string } => {
  if (x < 0 || y < 0 || x + w > deckW || y + h > deckH) {
    return { ok: false, reason: '超出甲板边界' }
  }
  for (const fz of forbiddenZones) {
    if (x < fz.x + fz.width && x + w > fz.x && y < fz.y + fz.height && y + h > fz.y) {
      return { ok: false, reason: '落入禁放区域', zoneName: fz.name }
    }
  }
  return { ok: true }
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  currentLevelId: null,
  currentLevel: null,
  placements: [],
  history: [],
  gridSnap: true,
  selectedCargoId: null,
  startTime: null,
  undoCount: 0,
  restartCount: 0,
  boundaryFailures: 0,
  collisionEvents: 0,
  gridSnapChanges: 0,
  resolvedIssueIds: [],
  lastCollisionDiff: null,

  setLevel: (levelId: string) => {
    const level = getLevelById(levelId)
    if (!level) return
    set({
      currentLevelId: levelId,
      currentLevel: level,
      placements: [],
      history: [],
      gridSnap: true,
      selectedCargoId: null,
      startTime: Date.now(),
      undoCount: 0,
      restartCount: 0,
      boundaryFailures: 0,
      collisionEvents: 0,
      gridSnapChanges: 0,
      resolvedIssueIds: [],
      lastCollisionDiff: null,
    })
  },

  selectCargo: (cargoId) => set({ selectedCargoId: cargoId }),

  toggleGridSnap: () => {
    const { gridSnap } = get()
    set({
      gridSnap: !gridSnap,
      gridSnapChanges: get().gridSnapChanges + 1,
    })
  },

  placeCargo: (cargoId: string, x: number, y: number) => {
    const { currentLevel, placements, gridSnap, history } = get()
    if (!currentLevel) return { success: false, message: '未加载关卡' }
    const cargo = currentLevel.cargoList.find((c) => c.id === cargoId)
    if (!cargo) return { success: false, message: '货物不存在' }

    const existing = placements.find((p) => p.cargoId === cargoId)
    if (existing) {
      return { success: false, message: '该货物已放置，如需移动请先移除或撤销' }
    }

    let finalX = x
    let finalY = y
    if (gridSnap) {
      finalX = Math.round(x / currentLevel.deckConfig.gridSize) * currentLevel.deckConfig.gridSize
      finalY = Math.round(y / currentLevel.deckConfig.gridSize) * currentLevel.deckConfig.gridSize
    }

    const boundary = checkBoundary(
      finalX,
      finalY,
      cargo.width,
      cargo.height,
      currentLevel.deckConfig.width,
      currentLevel.deckConfig.height,
      currentLevel.deckConfig.forbiddenZones
    )

    if (!boundary.ok) {
      set({ boundaryFailures: get().boundaryFailures + 1 })
      const msg = boundary.zoneName
        ? `边界失败：${boundary.reason} —「${boundary.zoneName}」。请撤销后重新放置。`
        : `边界失败：${boundary.reason}。请撤销后重新放置。`
      return { success: false, message: msg }
    }

    const placementBefore: Placement = {
      id: uid(),
      cargoId,
      x: x,
      y: y,
      gridSnapped: false,
      isValid: true,
      placedAt: now(),
    }

    const collisionRaw = checkCollision(placementBefore, placements, cargo.width, cargo.height)
    if (collisionRaw && !gridSnap) {
      set({
        collisionEvents: get().collisionEvents + 1,
        lastCollisionDiff: { before: placementBefore, after: null },
      })
      return { success: false, message: `碰撞检测：与已放置货物重叠（关闭网格吸附状态下）` }
    }

    const newPlacement: Placement = {
      id: uid(),
      cargoId,
      x: finalX,
      y: finalY,
      gridSnapped: gridSnap,
      isValid: true,
      placedAt: now(),
    }

    const collision = checkCollision(newPlacement, placements, cargo.width, cargo.height)
    if (collision) {
      set({ collisionEvents: get().collisionEvents + 1 })
      return { success: false, message: `碰撞检测：与已放置货物重叠` }
    }

    if (!gridSnap && Math.abs(finalX - x) + Math.abs(finalY - y) > 0) {
      set({
        lastCollisionDiff: { before: placementBefore, after: newPlacement },
      })
    }

    const action: HistoryAction = {
      id: uid(),
      action: 'place',
      description: `放置「${cargo.name}」到 (${finalX}, ${finalY})${gridSnap ? ' [网格吸附]' : ''}`,
      timestamp: now(),
      placementsBefore: [...placements],
      placementsAfter: [...placements, newPlacement],
    }

    set({
      placements: [...placements, newPlacement],
      history: [...history, action],
      selectedCargoId: null,
    })

    return { success: true }
  },

  undo: () => {
    const { history, placements, currentLevel } = get()
    if (history.length === 0) return
    const lastAction = history[history.length - 1]
    const desyncMaterials: Record<string, string> = {}
    if (currentLevel) {
      for (const cargo of currentLevel.cargoList) {
        if (cargo.hasIssue && cargo.issueType === 'duplicate_annotation') {
          desyncMaterials[cargo.id] = '标注草稿 + 现场截图圈注（两份材料冲突，撤销后需说明保留哪一份）'
        }
      }
    }

    const removedPlacement = lastAction.placementsAfter.find(
      (p) => !lastAction.placementsBefore.some((pb) => pb.id === p.id)
    )
    const desyncCargo = removedPlacement ? desyncMaterials[removedPlacement.cargoId] : undefined

    const undoAction: HistoryAction = {
      id: uid(),
      action: 'undo',
      description: `撤销操作：${lastAction.description}`,
      timestamp: now(),
      placementsBefore: placements,
      placementsAfter: lastAction.placementsBefore,
      stateDesync: desyncCargo
        ? {
            material: desyncCargo,
            reason: '撤销后状态不同步 — 两份材料指向同一货物，需在报告中说明以哪份为准',
          }
        : undefined,
    }

    set({
      placements: lastAction.placementsBefore,
      history: [...history, undoAction],
      undoCount: get().undoCount + 1,
    })
  },

  restart: () => {
    const { currentLevel, history, placements, startTime } = get()
    if (!currentLevel) return
    const restartAction: HistoryAction = {
      id: uid(),
      action: 'restart',
      description: '重开关卡：清空所有已放置货物，重新开始标注',
      timestamp: now(),
      placementsBefore: placements,
      placementsAfter: [],
      stateDesync: {
        material: '全部材料批次（底图坐标+截图+补录清单）',
        reason: '重开后之前的放置记录全部丢失，需在报告中注明重开原因',
      },
    }
    set({
      placements: [],
      history: [...history, restartAction],
      restartCount: get().restartCount + 1,
      selectedCargoId: null,
      startTime: startTime ?? Date.now(),
    })
  },

  removePlacement: (placementId: string) => {
    const { placements, history, currentLevel } = get()
    const p = placements.find((pp) => pp.id === placementId)
    if (!p || !currentLevel) return
    const cargo = currentLevel.cargoList.find((c) => c.id === p.cargoId)
    const clearAction: HistoryAction = {
      id: uid(),
      action: 'clear',
      description: `移除「${cargo?.name ?? p.cargoId}」的放置`,
      timestamp: now(),
      placementsBefore: placements,
      placementsAfter: placements.filter((pp) => pp.id !== placementId),
    }
    set({
      placements: placements.filter((pp) => pp.id !== placementId),
      history: [...history, clearAction],
    })
  },

  markIssueResolved: (issueId: string) => {
    const { resolvedIssueIds } = get()
    if (resolvedIssueIds.includes(issueId)) return
    set({ resolvedIssueIds: [...resolvedIssueIds, issueId] })
  },

  generateReport: () => {
    const {
      currentLevel,
      placements,
      history,
      startTime,
      undoCount,
      restartCount,
      boundaryFailures,
      collisionEvents,
      gridSnapChanges,
      resolvedIssueIds,
    } = get()
    if (!currentLevel) return null

    const issues: ReportData['issues'] = []
    for (const cargo of currentLevel.cargoList) {
      if (cargo.hasIssue && cargo.issueType && cargo.issueDescription) {
        const sourceMap: Record<string, string> = {
          missing_unit: '调度室补录Excel（单位栏空）',
          duplicate_annotation: '标注草稿 + 现场截图圈注（两份材料重复）',
          old_note: '2019版底图旧备注',
          supplementary: '安全员微信补录（无纸质清单）',
          wrong_coordinates: '2019版底图坐标表（已过时）',
        }
        const isPlaced = placements.some((p) => p.cargoId === cargo.id)
        const typeLabel: Record<string, string> = {
          missing_unit: '漏填重量单位',
          duplicate_annotation: '重复标注（多份材料冲突）',
          old_note: '旧备注干扰',
          supplementary: '口头补录无凭证',
          wrong_coordinates: '底图坐标过期',
        }
        issues.push({
          cargoId: cargo.id,
          cargoName: cargo.name,
          issueType: typeLabel[cargo.issueType] ?? cargo.issueType,
          issueDescription: cargo.issueDescription,
          materialSource: sourceMap[cargo.issueType] ?? '未知来源',
          resolved: isPlaced,
        })
      }
    }

    for (const exp of currentLevel.expectedIssues) {
      const already = issues.some((i) => i.issueDescription.includes(exp.description.slice(0, 10)))
      if (!already) {
        const typeLabel: Record<string, string> = {
          boundary_failure: '边界放置失败',
          collision: '碰撞边界误判',
          state_desync: '撤销后状态不同步',
          data_quality: '材料数据质量问题',
        }
        issues.push({
          cargoId: 'scenario-' + exp.id,
          cargoName: '流程性问题',
          issueType: typeLabel[exp.type] ?? exp.type,
          issueDescription: exp.description,
          materialSource: exp.materialSource,
          resolved: resolvedIssueIds.includes(exp.id),
        })
      }
    }

    return {
      levelId: currentLevel.id,
      levelName: currentLevel.name,
      completedAt: now(),
      totalDuration: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
      placements,
      undoCount,
      restartCount,
      boundaryFailures,
      collisionEvents,
      gridSnapChanges,
      issues,
      history,
    }
  },

  resetAll: () => {
    set({
      currentLevelId: null,
      currentLevel: null,
      placements: [],
      history: [],
      gridSnap: true,
      selectedCargoId: null,
      startTime: null,
      undoCount: 0,
      restartCount: 0,
      boundaryFailures: 0,
      collisionEvents: 0,
      gridSnapChanges: 0,
      resolvedIssueIds: [],
      lastCollisionDiff: null,
    })
  },
}))

export const useCargoInfo = (cargoId: string): Cargo | undefined => {
  const level = useAnnotationStore((s) => s.currentLevel)
  return level?.cargoList.find((c) => c.id === cargoId)
}
