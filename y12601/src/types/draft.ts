export interface DraftEntry {
  id: string
  position: string
  positionLabel: string
  userColorName: string
  correctColorName: string
  isCorrect: boolean
  source: 'old_table' | 'supplementary_note' | 'new_annotation' | 'both'
  sourceName: string
  notes: string
  hasIssue: boolean
  issueType: 'mismatch' | 'duplicate' | 'missing_unit' | 'inconsistent_name' | ''
  issueDescription: string
  isDuplicate: boolean
  duplicateReason: string
}

export interface DraftRecord {
  id: string
  levelId: string
  levelName: string
  createdAt: string
  accuracy: number
  entryCount: number
  issueCount: number
  entries: DraftEntry[]
  summary: string
}

export interface ExportBlock {
  title: string
  lines: string[]
}
