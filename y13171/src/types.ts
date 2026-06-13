export interface WarningRecord {
  id: string
  deviceId: string
  measuredValue: number
  threshold: number
  status: 'normal' | 'warning' | 'suspended' | 'confirmed' | 'rejected'
  sceneLabel: string
  note: string
  noteSource: 'sensor' | 'manual' | 'backfill'
  isBackfilled: boolean
  originalTime: string | null
  recordTime: string
  lastModified: string
  sourceTag: string
}

export type RecordStatus = WarningRecord['status']
export type NoteSource = WarningRecord['noteSource']
