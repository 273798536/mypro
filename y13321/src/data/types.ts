export type Stage = 'old' | 'manual' | 'new'

export type ChangeStatus = '改判' | '一致' | '漂移待确认'

export type ProcessingStatus =
  | '待处理'
  | '已对比'
  | '已人工修正'
  | '已回灌'
  | '待确认'

export type Band = '一类文' | '二类文' | '三类文' | '四类文'

export interface VersionEvent {
  stage: Stage
  score: number
  band: Band
  rationale: string
  actor: string
  ts: string
}

export interface DriftInfo {
  detected: boolean
  reason: string
  impactScope: string
  thresholdBand: Band
}

export interface DimensionRow {
  stage: Stage
  内容: number
  结构: number
  语言: number
  书写: number
}

export interface Sample {
  sampleId: string
  source: string
  essayTitle: string
  essayContent: string
  gradeLevel: string
  rawFields: Record<string, string>
  processingStatus: ProcessingStatus
  changeStatus: ChangeStatus
  storyline: VersionEvent[]
  drift: DriftInfo
  dimensions: DimensionRow[]
  rejudgeable: boolean
  explainsChange?: boolean
}

export interface FilterCriteria {
  source: string
  changeStatus: ChangeStatus | 'all'
  processingStatus: ProcessingStatus | 'all'
  gradeLevel: string
  band: Band | 'all'
}

export interface SummaryCounts {
  total: number
  change: number
  consistent: number
  drift: number
  pending: number
}

export interface ConsistencyItem {
  label: string
  screen: string
  file: string
  match: boolean
}

export interface ConsistencyResult {
  ok: boolean
  items: ConsistencyItem[]
}

export const BAND_THRESHOLDS: { band: Band; min: number; max: number }[] = [
  { band: '一类文', min: 45, max: 50 },
  { band: '二类文', min: 38, max: 44 },
  { band: '三类文', min: 30, max: 37 },
  { band: '四类文', min: 0, max: 29 },
]

export const FULL_SCORE = 50

export function bandForScore(score: number): Band {
  if (score >= 45) return '一类文'
  if (score >= 38) return '二类文'
  if (score >= 30) return '三类文'
  return '四类文'
}
