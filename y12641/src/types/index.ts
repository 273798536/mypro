export interface Cargo {
  id: string
  name: string
  width: number
  height: number
  weight?: number
  unit?: string
  notes?: string
  hasIssue?: boolean
  issueType?: 'missing_unit' | 'duplicate_annotation' | 'old_note' | 'supplementary' | 'wrong_coordinates'
  issueDescription?: string
}

export interface Placement {
  id: string
  cargoId: string
  x: number
  y: number
  gridSnapped: boolean
  isValid: boolean
  issue?: string
  placedAt: string
}

export interface DeckConfig {
  width: number
  height: number
  gridSize: number
  forbiddenZones: ForbiddenZone[]
  oldNotes: OldNote[]
}

export interface ForbiddenZone {
  id: string
  x: number
  y: number
  width: number
  height: number
  name: string
}

export interface OldNote {
  id: string
  x: number
  y: number
  text: string
  source: 'coordinate_backlog' | 'screenshot_remark' | 'collision_misjudge'
}

export interface LevelIssue {
  id: string
  type: 'boundary_failure' | 'collision' | 'state_desync' | 'data_quality'
  description: string
  materialSource: string
  resolved: boolean
}

export interface Level {
  id: string
  name: string
  description: string
  deckConfig: DeckConfig
  cargoList: Cargo[]
  expectedIssues: LevelIssue[]
  scenario: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface HistoryAction {
  id: string
  action: 'place' | 'undo' | 'restart' | 'snap_toggle' | 'clear'
  description: string
  timestamp: string
  placementsBefore: Placement[]
  placementsAfter: Placement[]
  stateDesync?: {
    material: string
    reason: string
  }
}

export interface ReportData {
  levelId: string
  levelName: string
  completedAt: string
  totalDuration: number
  placements: Placement[]
  undoCount: number
  restartCount: number
  boundaryFailures: number
  collisionEvents: number
  gridSnapChanges: number
  issues: {
    cargoId: string
    cargoName: string
    issueType: string
    issueDescription: string
    materialSource: string
    resolved: boolean
  }[]
  history: HistoryAction[]
}
