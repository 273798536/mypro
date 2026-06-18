import type { Band, Sample, VersionEvent } from '@/data/types'
import { bandForScore } from '@/data/types'

export interface DriftFlag {
  detected: boolean
  reason: string
  impactScope: string
  thresholdBand: Band
}

const BAND_ORDER: Band[] = ['一类文', '二类文', '三类文', '四类文']
const BOUNDARIES = [45, 38, 30]

export function getEvent(sample: Sample, stage: 'old' | 'new' | 'manual'): VersionEvent | undefined {
  return sample.storyline.find((e) => e.stage === stage)
}

export function bandCrossed(oldEvent?: VersionEvent, newEvent?: VersionEvent): boolean {
  if (!oldEvent || !newEvent) return false
  return oldEvent.band !== newEvent.band
}

export function crossedBoundary(oldBand: Band, newBand: Band): number | null {
  if (oldBand === newBand) return null
  const lo = Math.min(BAND_ORDER.indexOf(oldBand), BAND_ORDER.indexOf(newBand))
  return BOUNDARIES[lo] ?? null
}

export function detectDrift(sample: Sample): DriftFlag {
  const oldEvent = getEvent(sample, 'old')
  const newEvent = getEvent(sample, 'new')
  if (!oldEvent || !newEvent) {
  return {
      detected: false,
      thresholdBand: newEvent?.band ?? '三类文',
      reason: '',
      impactScope: '',
    }
  }
  const boundary = crossedBoundary(oldEvent.band, newEvent.band)
  if (boundary == null || Math.abs(newEvent.score - boundary) > 1) {
    return {
      detected: false,
      thresholdBand: newEvent.band,
      reason: '',
      impactScope: '',
    }
  }
  const band = newEvent.band
  return {
    detected: true,
    thresholdBand: band,
    reason: `新模型分值 ${newEvent.score} 跨越 ${boundary} 分阈值带边界、由「${oldEvent.band}」翻转为「${band}」且贴近边界 ±1，疑似阈值带漂移，需人工确认是否调整阈值或回滚该档判定。`,
    impactScope: `该样本所在「${oldEvent.band}↔${band}」分界附近的同类样本可能整体受影响，建议扩大复核至该分界两侧 ±2 区间内的全部跨带样本。`,
  }
}

export function aggregateDrift(samples: Sample[]): {
  hasDrift: boolean
  flagged: Sample[]
  bands: { band: Band; oldCount: number; newCount: number; delta: number }[]
} {
  const flagged = samples.filter((s) => detectDrift(s).detected)
  const bandList: Band[] = ['一类文', '二类文', '三类文', '四类文']
  const bands = bandList.map((band) => {
    const oldCount = samples.filter((s) => getEvent(s, 'old')?.band === band).length
    const newCount = samples.filter((s) => getEvent(s, 'new')?.band === band).length
    return { band, oldCount, newCount, delta: newCount - oldCount }
  })
  return { hasDrift: flagged.length > 0, flagged, bands }
}

export function scoreToBand(score: number): Band {
  return bandForScore(score)
}
