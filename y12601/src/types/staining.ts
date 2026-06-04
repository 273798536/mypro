export interface PaletteColor {
  index: number
  name: string
  hex: string
}

export interface GridCell {
  row: number
  col: number
  correctColorIndex: number
  userColorIndex: number
  isBoundary: boolean
  isBoundaryTouched: boolean
}

export interface StainingAction {
  type: 'stain' | 'erase'
  row: number
  col: number
  previousColorIndex: number
  newColorIndex: number
  timestamp: number
  snappedFrom?: { row: number; col: number }
}

export interface BoundaryFailure {
  row: number
  col: number
  description: string
}

export interface UndoSyncBug {
  id: string
  triggerStep: number
  triggerDescription: string
  afterUndoState: string
  expectedState: string
  resultDifference: string
}

export interface UndoSyncIssue {
  bugId: string
  description: string
  expectedState: string
  actualState: string
  impactOnResult: string
}

export interface StainingLevel {
  id: string
  name: string
  description: string
  gridSize: number
  correctPattern: number[][]
  boundaryCells: [number, number][]
  colorPalette: PaletteColor[]
  scenario: 'basic' | 'boundary' | 'undo'
  tips: string[]
  undoSyncBugs: UndoSyncBug[]
  snapOffsetCells: { row: number; col: number; offsetRow: number; offsetCol: number }[]
}

export interface HitDetectionResult {
  totalCells: number
  correctCells: number
  accuracy: number
  boundaryFailures: BoundaryFailure[]
  cellResults: { row: number; col: number; isHit: boolean; userColor: string; correctColor: string }[]
}

export interface GridSnapDiff {
  withSnap: { row: number; col: number; colorIndex: number }[]
  withoutSnap: { row: number; col: number; colorIndex: number }[]
  diffCells: { row: number; col: number; snapColor: string; noSnapColor: string }[]
}
