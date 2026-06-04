import type { GridCell, HitDetectionResult, GridSnapDiff } from '@/types/staining'
import { PALETTE_COLORS } from '@/data/colors'

export function calculateHitDetection(cells: GridCell[][]): HitDetectionResult {
  let totalCells = 0
  let correctCells = 0
  const cellResults: HitDetectionResult['cellResults'] = []
  const boundaryFailures: HitDetectionResult['boundaryFailures'] = []

  cells.forEach((row) => {
    row.forEach((cell) => {
      if (cell.correctColorIndex === 0 && cell.userColorIndex <= 0) return
      totalCells++

      const userColorName = PALETTE_COLORS[cell.userColorIndex >= 0 ? cell.userColorIndex : 0]?.name || '未染色'
      const correctColorName = PALETTE_COLORS[cell.correctColorIndex]?.name || '未染色'
      const isHit = cell.userColorIndex === cell.correctColorIndex

      if (isHit) correctCells++

      cellResults.push({
        row: cell.row,
        col: cell.col,
        isHit,
        userColor: userColorName,
        correctColor: correctColorName,
      })

      if (cell.isBoundaryTouched) {
        boundaryFailures.push({
          row: cell.row,
          col: cell.col,
          description: `第${cell.row + 1}行第${cell.col + 1}列：边界区域被涂色(${userColorName})`,
        })
      }
    })
  })

  return {
    totalCells,
    correctCells,
    accuracy: totalCells > 0 ? correctCells / totalCells : 0,
    boundaryFailures,
    cellResults,
  }
}

export function calculateGridSnapDiff(
  cells: GridCell[][],
  snapOffsetCells: { row: number; col: number; offsetRow: number; offsetCol: number }[]
): GridSnapDiff {
  const withSnap = cells.flat().map((c) => ({
    row: c.row,
    col: c.col,
    colorIndex: c.userColorIndex,
  }))

  const sourceMap = new Map<string, { offsetRow: number; offsetCol: number }>()
  snapOffsetCells.forEach((s) => {
    sourceMap.set(`${s.row}-${s.col}`, { offsetRow: s.offsetRow, offsetCol: s.offsetCol })
  })

  const noSnapCells = cells.map((r) => r.map((c) => ({ ...c, userColorIndex: -1 as number })))

  const userStained = cells.flat().filter((c) => c.userColorIndex > 0)
  userStained.forEach((cell) => {
    const offset = sourceMap.get(`${cell.row}-${cell.col}`)
    if (offset) {
      if (noSnapCells[offset.offsetRow] && noSnapCells[offset.offsetRow][offset.offsetCol]) {
        noSnapCells[offset.offsetRow][offset.offsetCol].userColorIndex = cell.userColorIndex
      }
    } else {
      noSnapCells[cell.row][cell.col].userColorIndex = cell.userColorIndex
    }
  })

  const withoutSnap = noSnapCells.flat().map((c) => ({
    row: c.row,
    col: c.col,
    colorIndex: c.userColorIndex,
  }))

  const diffCells: GridSnapDiff['diffCells'] = []
  const withSnapMap = new Map(withSnap.map((c) => [`${c.row}-${c.col}`, c]))
  const noSnapMap = new Map(withoutSnap.map((c) => [`${c.row}-${c.col}`, c]))

  const allKeys = new Set([...withSnapMap.keys(), ...noSnapMap.keys()])
  allKeys.forEach((key) => {
    const ws = withSnapMap.get(key)
    const ns = noSnapMap.get(key)
    const wsColor = PALETTE_COLORS[ws?.colorIndex >= 0 ? ws.colorIndex : 0]?.name || '未染色'
    const nsColor = PALETTE_COLORS[ns?.colorIndex >= 0 ? ns.colorIndex : 0]?.name || '未染色'
    if (wsColor !== nsColor && (ws?.colorIndex > 0 || ns?.colorIndex > 0)) {
      diffCells.push({
        row: ws?.row ?? ns?.row ?? 0,
        col: ws?.col ?? ns?.col ?? 0,
        snapColor: wsColor,
        noSnapColor: nsColor,
      })
    }
  })

  return { withSnap, withoutSnap, diffCells }
}
