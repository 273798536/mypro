import type { DataRecord, MonteCarloResult } from '@/types'
import { convertToBase, convertFromBase } from './units'

function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return num * stdDev + mean
}

function calculateConfidenceInterval(
  sortedSamples: number[],
  level: number
): { lower: number; upper: number } {
  const n = sortedSamples.length
  const lowerIdx = Math.floor((1 - level) / 2 * n)
  const upperIdx = Math.ceil((1 + level) / 2 * n) - 1
  return {
    lower: sortedSamples[Math.max(0, lowerIdx)],
    upper: sortedSamples[Math.min(n - 1, upperIdx)],
  }
}

function buildHistogram(
  samples: number[],
  binCount: number = 30
): { bins: number[]; counts: number[] } {
  if (samples.length === 0) {
    return { bins: [], counts: [] }
  }

  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const range = max - min || 1

  const binWidth = range / binCount
  const bins: number[] = []
  const counts: number[] = new Array(binCount).fill(0)

  for (let i = 0; i <= binCount; i++) {
    bins.push(min + i * binWidth)
  }

  for (const sample of samples) {
    let binIdx = Math.floor((sample - min) / binWidth)
    binIdx = Math.min(binIdx, binCount - 1)
    binIdx = Math.max(binIdx, 0)
    counts[binIdx]++
  }

  return { bins, counts }
}

export function runMonteCarloSimulation(
  records: DataRecord[],
  simulationCount: number,
  targetUnit: string,
  confidenceLevel: number = 0.95
): MonteCarloResult {
  if (records.length === 0) {
    return {
      samples: [],
      mean: 0,
      stdDev: 0,
      variance: 0,
      confidenceInterval: { lower: 0, upper: 0, level: confidenceLevel },
      histogram: { bins: [], counts: [] },
      relativeError: 0,
    }
  }

  const allSamples: number[] = []

  for (const record of records) {
    const valueInBase = convertToBase(record.value, record.unit)
    const errorInBase = convertToBase(record.error, record.unit)

    const samplesPerRecord = Math.ceil(simulationCount / records.length)

    for (let i = 0; i < samplesPerRecord; i++) {
      const sample = gaussianRandom(valueInBase, errorInBase)
      allSamples.push(sample)
    }
  }

  const trimmedSamples = allSamples.slice(0, simulationCount)
  const sorted = [...trimmedSamples].sort((a, b) => a - b)

  const n = sorted.length
  const mean = sorted.reduce((sum, val) => sum + val, 0) / n
  const variance = sorted.reduce((sum, val) => sum + (val - mean) ** 2, 0) / (n - 1)
  const stdDev = Math.sqrt(variance)

  const ciBase = calculateConfidenceInterval(sorted, confidenceLevel)
  const relativeError = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0

  const histogramBase = buildHistogram(trimmedSamples)

  return {
    samples: trimmedSamples.map(s => convertFromBase(s, targetUnit)),
    mean: convertFromBase(mean, targetUnit),
    stdDev: convertFromBase(stdDev, targetUnit),
    variance: convertFromBase(variance, targetUnit),
    confidenceInterval: {
      lower: convertFromBase(ciBase.lower, targetUnit),
      upper: convertFromBase(ciBase.upper, targetUnit),
      level: confidenceLevel,
    },
    histogram: {
      bins: histogramBase.bins.map(b => convertFromBase(b, targetUnit)),
      counts: histogramBase.counts,
    },
    relativeError,
  }
}
