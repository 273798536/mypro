import { create } from 'zustand'
import type { GridCell, StainingAction, BoundaryFailure, UndoSyncIssue, StainingLevel } from '@/types/staining'
import { PALETTE_COLORS } from '@/data/colors'

interface StainingState {
  currentLevel: StainingLevel | null
  gridCells: GridCell[][]
  selectedColorIndex: number
  isGridSnapEnabled: boolean
  history: StainingAction[]
  boundaryFailures: BoundaryFailure[]
  undoSyncIssues: UndoSyncIssue[]
  isCompleted: boolean
  actionCount: number

  loadLevel: (level: StainingLevel) => void
  selectColor: (index: number) => void
  stainCell: (row: number, col: number) => void
  undo: () => void
  restart: () => void
  toggleGridSnap: () => void
  submit: () => void
}

const createGridCells = (level: StainingLevel): GridCell[][] => {
  const cells: GridCell[][] = []
  const boundarySet = new Set(level.boundaryCells.map(([r, c]) => `${r}-${c}`))
  for (let r = 0; r < level.gridSize; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < level.gridSize; c++) {
      row.push({
        row: r,
        col: c,
        correctColorIndex: level.correctPattern[r][c],
        userColorIndex: -1,
        isBoundary: boundarySet.has(`${r}-${c}`),
        isBoundaryTouched: false,
      })
    }
    cells.push(row)
  }
  return cells
}

export const useStainingStore = create<StainingState>((set, get) => ({
  currentLevel: null,
  gridCells: [],
  selectedColorIndex: 1,
  isGridSnapEnabled: true,
  history: [],
  boundaryFailures: [],
  undoSyncIssues: [],
  isCompleted: false,
  actionCount: 0,

  loadLevel: (level) => {
    set({
      currentLevel: level,
      gridCells: createGridCells(level),
      selectedColorIndex: 1,
      isGridSnapEnabled: true,
      history: [],
      boundaryFailures: [],
      undoSyncIssues: [],
      isCompleted: false,
      actionCount: 0,
    })
  },

  selectColor: (index) => {
    set({ selectedColorIndex: index })
  },

  stainCell: (row, col) => {
    const state = get()
    if (!state.currentLevel || state.isCompleted) return
    if (state.selectedColorIndex === 0) return

    let targetRow = row
    let targetCol = col

    if (!state.isGridSnapEnabled) {
      const offsetCell = state.currentLevel.snapOffsetCells.find(
        (s) => s.row === row && s.col === col
      )
      if (offsetCell) {
        targetRow = offsetCell.offsetRow
        targetCol = offsetCell.offsetCol
      }
    }

    const newCells = state.gridCells.map((r) => r.map((c) => ({ ...c })))
    const cell = newCells[targetRow][targetCol]
    const previousColorIndex = cell.userColorIndex

    cell.userColorIndex = state.selectedColorIndex

    if (cell.isBoundary && state.selectedColorIndex > 0) {
      cell.isBoundaryTouched = true
    }

    const newAction: StainingAction = {
      type: 'stain',
      row: targetRow,
      col: targetCol,
      previousColorIndex,
      newColorIndex: state.selectedColorIndex,
      timestamp: Date.now(),
      snappedFrom: targetRow !== row || targetCol !== col ? { row, col: col } : undefined,
    }

    const newHistory = [...state.history, newAction]
    const newActionCount = state.actionCount + 1
    const newUndoSyncIssues = [...state.undoSyncIssues]

    if (state.currentLevel.scenario === 'undo') {
      state.currentLevel.undoSyncBugs.forEach((bug) => {
        if (bug.triggerStep === newActionCount) {
          newUndoSyncIssues.push({
            bugId: bug.id,
            description: bug.triggerDescription,
            expectedState: bug.expectedState,
            actualState: bug.afterUndoState,
            impactOnResult: bug.resultDifference,
          })
        }
      })
    }

    set({
      gridCells: newCells,
      history: newHistory,
      actionCount: newActionCount,
      undoSyncIssues: newUndoSyncIssues,
    })
  },

  undo: () => {
    const state = get()
    if (state.history.length === 0 || !state.currentLevel) return

    const lastAction = state.history[state.history.length - 1]
    const newCells = state.gridCells.map((r) => r.map((c) => ({ ...c })))
    const cell = newCells[lastAction.row][lastAction.col]

    cell.userColorIndex = lastAction.previousColorIndex

    if (state.currentLevel.scenario === 'undo') {
      const bug = state.currentLevel.undoSyncBugs.find(
        (b) => b.triggerStep === state.actionCount
      )
      if (bug && bug.id === 'bug_boundary_mark') {
        const nearbyCell = newCells[lastAction.row]?.[lastAction.col - 1]
        if (nearbyCell && nearbyCell.isBoundary) {
          // isBoundaryTouched NOT cleared - this is the bug
        }
      }
      if (bug && bug.id === 'bug_color_select') {
        // Color selector NOT reverted - this is the bug
        // We intentionally do NOT change selectedColorIndex back
      }
    } else {
      if (lastAction.previousColorIndex >= 0) {
        set({ selectedColorIndex: lastAction.previousColorIndex })
      }
    }

    if (cell.isBoundary && lastAction.previousColorIndex <= 0) {
      if (state.currentLevel.scenario !== 'undo') {
        cell.isBoundaryTouched = false
      }
    }

    set({
      gridCells: newCells,
      history: state.history.slice(0, -1),
    })
  },

  restart: () => {
    const state = get()
    if (!state.currentLevel) return

    const newCells = createGridCells(state.currentLevel)
    const newUndoSyncIssues = [...state.undoSyncIssues]

    if (state.currentLevel.scenario === 'undo') {
      const snapBug = state.currentLevel.undoSyncBugs.find(
        (b) => b.id === 'bug_snap_residual'
      )
      if (snapBug) {
        newUndoSyncIssues.push({
          bugId: snapBug.id,
          description: snapBug.triggerDescription,
          expectedState: snapBug.expectedState,
          actualState: snapBug.afterUndoState,
          impactOnResult: snapBug.resultDifference,
        })
      }
    }

    set({
      gridCells: newCells,
      selectedColorIndex: 1,
      history: [],
      boundaryFailures: [],
      isCompleted: false,
      actionCount: 0,
      undoSyncIssues: newUndoSyncIssues,
    })
  },

  toggleGridSnap: () => {
    set((state) => ({ isGridSnapEnabled: !state.isGridSnapEnabled }))
  },

  submit: () => {
    const state = get()
    if (!state.currentLevel) return

    const failures: BoundaryFailure[] = []
    state.gridCells.forEach((row) => {
      row.forEach((cell) => {
        if (cell.isBoundaryTouched) {
          failures.push({
            row: cell.row,
            col: cell.col,
            description: `第${cell.row + 1}行第${cell.col + 1}列：边界区域被涂色(${PALETTE_COLORS[cell.userColorIndex]?.name || '未知'})`,
          })
        }
      })
    })

    set({
      boundaryFailures: failures,
      isCompleted: true,
    })
  },
}))
