export interface RawDataRow {
  rowIndex: number
  timestamp: number
  pitch: number | null
  amplitude: number | null
  lyricsSegment: string | null
  practiceCount: number | null
  rawLine: string
}

export interface CleanedRow {
  id: string
  timestamp: number
  pitch: number
  amplitude: number
  lyricsSegment: string
  practiceCount: number
  sourceRowIndex: number
}

export interface BadRow {
  rowIndex: number
  rawLine: string
  reason: "empty" | "comment" | "missing_column"
  missingColumns: string[]
  recovered: boolean
}

export interface BreathingPoint {
  id: string
  timestamp: number
  duration: number
  amplitudeBefore: number
  amplitudeAfter: number
  confidence: number
  source: "auto" | "manual"
}

export interface SilenceSegment {
  id: string
  startTimestamp: number
  endTimestamp: number
  duration: number
  isMisjudgment: boolean
  misjudgmentReason?: string
  reviewed: boolean
}

export interface LyricsAlignment {
  id: string
  lyricsSegment: string
  startTimestamp: number
  endTimestamp: number
  isMisaligned: boolean
  misalignmentDetail?: string
  isOverLong: boolean
  durationThreshold: number
  reviewed: boolean
}

export interface TraceLink {
  resultId: string
  audioAnalysisRef: string
  lyricsAlignmentRef: string
  breathingAdviceRef: string
}

export interface AnalysisResult {
  id: string
  studentName: string
  songTitle: string
  practiceIndex: number
  breathingPoints: BreathingPoint[]
  silenceSegments: SilenceSegment[]
  lyricsAlignments: LyricsAlignment[]
  melodyLine: MelodyPoint[]
  traceLink: TraceLink
}

export interface MelodyPoint {
  timestamp: number
  pitch: number
}

export interface PracticeStat {
  studentName: string
  songTitle: string
  count: number
}

export type BadRowReason = "empty" | "comment" | "missing_column"

export type ExportFormat = "csv" | "json"
