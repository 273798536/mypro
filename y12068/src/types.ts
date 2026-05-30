export interface BeatLine {
  id: string
  tick: number
  label: string
  isRest: boolean
}

export interface NoteEvent {
  id: string
  tick: number
  duration: number
  isEntry: boolean
}

export interface VolumePoint {
  tick: number
  volume: number
}

export interface PartTrack {
  id: string
  name: string
  shortName: string
  color: string
  notes: NoteEvent[]
  volumeProfile: VolumePoint[]
}

export interface ConflictItem {
  type: 'timing_mismatch' | 'rest_overlap' | 'entry_mismatch'
  partTrackId: string
  partTrackName: string
  beatLineTick: number
  beatLineLabel: string
  partTrackValue: string
  beatLineValue: string
  description: string
}

export type JudgmentType = 'perfect' | 'early' | 'late' | 'miss'

export interface JudgmentResult {
  tick: number
  beatLabel: string
  partTrackId: string
  partTrackName: string
  judgment: JudgmentType
  offsetMs: number
  volume: number
  isDelayedEntry: boolean
  isRestViolation: boolean
  isVolumeImbalance: boolean
}

export interface JudgmentCriteria {
  perfectWindowMs: number
  earlyWindowMs: number
  lateWindowMs: number
  volumeImbalanceThreshold: number
  restVolumeThreshold: number
}

export interface ScoreReport {
  levelId: string
  levelName: string
  timestamp: string
  judgments: JudgmentResult[]
  criteria: JudgmentCriteria
  summary: {
    totalNotes: number
    perfectCount: number
    earlyCount: number
    lateCount: number
    missCount: number
    delayedEntryCount: number
    restViolationCount: number
    volumeImbalanceCount: number
  }
}

export interface LevelData {
  id: string
  name: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
  focusTag: string
  bpm: number
  beatsPerBar: number
  totalBars: number
  beatLines: BeatLine[]
  partTracks: PartTrack[]
  criteria: JudgmentCriteria
}

export type PlayState = 'idle' | 'countdown' | 'playing' | 'finished'

export interface ActiveJudgment {
  partTrackId: string
  judgment: JudgmentType
  tick: number
  timestamp: number
}
