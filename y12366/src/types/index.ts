export interface AccelerationRecord {
  timestamp: number
  value: number
  saturated: boolean
}

export interface DisplacementRecord {
  timestamp: number
  value: number
}

export interface DamagePhoto {
  id: string
  timestamp: number | null
  imageUrl: string
  stage: string
  missingPhase: boolean
}

export interface AlignmentResult {
  id: string
  driftMs: number
  method: 'auto' | 'manual'
  createdAt: string
  accelOffset: number
  dispOffset: number
  photoOffset: number
}

export interface PeakExtraction {
  id: string
  alignmentId: string
  timestamp: number
  value: number
  channel: 'acceleration' | 'displacement'
  saturated: boolean
}

export type ConflictType = 'timestamp_drift' | 'photo_missing' | 'sensor_saturated_late'
export type Severity = 'high' | 'medium' | 'low'

export interface ConflictEntry {
  id: string
  type: ConflictType
  severity: Severity
  description: string
  relatedSourceIds: string[]
  judgment: string
  judgmentAt: string
  sequenceOrder: number
  timestamp: number
}

export interface TraceLink {
  resultId: string
  alignment: AlignmentResult
  peakExtraction: PeakExtraction
  damageAssociation: DamagePhoto[]
  conflicts: ConflictEntry[]
}

export interface ExportReport {
  displacementConclusion: string
  generatedAt: string
  traceLinks: TraceLink[]
  summary: string
}

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4

export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  speed: PlaybackSpeed
  startTime: number
  endTime: number
}
