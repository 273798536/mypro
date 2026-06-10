import { v4 as uuidv4 } from 'uuid'
import type { Peak, OverlapRegion } from '../types/index.js'

export interface PeakDetectionResult {
  peaks: Peak[]
  overlaps: OverlapRegion[]
  warnings: string[]
}

export function detectPeaks(temperatureCurve: number[][]): PeakDetectionResult {
  const warnings: string[] = []

  if (temperatureCurve.length < 10) {
    warnings.push('温度曲线数据点过少，可能影响检测精度')
  }

  const temps = temperatureCurve.map((p) => p[1])
  const times = temperatureCurve.map((p) => p[0])

  const d1: number[] = []
  for (let i = 1; i < temps.length; i++) {
    d1.push(temps[i] - temps[i - 1])
  }

  const d2: number[] = [0]
  for (let i = 1; i < d1.length; i++) {
    d2.push(d1[i] - d1[i - 1])
  }
  d2.push(0)

  const mean = d2.reduce((a, b) => a + b, 0) / d2.length
  const stdDev = Math.sqrt(d2.reduce((a, b) => a + (b - mean) ** 2, 0) / d2.length)
  const threshold = mean + 1.5 * stdDev

  const peakIndices: number[] = []
  for (let i = 2; i < d2.length - 2; i++) {
    if (
      d2[i] > threshold &&
      d2[i] > d2[i - 1] &&
      d2[i] > d2[i + 1] &&
      d2[i - 1] >= 0 &&
      d2[i + 1] <= 0
    ) {
      peakIndices.push(i)
    }
  }

  const peaks: Peak[] = peakIndices.map((idx) => {
    const leftIdx = Math.max(0, idx - 5)
    const rightIdx = Math.min(temps.length - 1, idx + 5)
    const localMaxIdx = temps
      .slice(leftIdx, rightIdx + 1)
      .reduce((maxI, val, i, arr) => (val > arr[maxI] ? i : maxI), 0) + leftIdx

    const halfHeight = (temps[localMaxIdx] + temps[leftIdx]) / 2
    let widthLeft = times[leftIdx]
    let widthRight = times[rightIdx]
    for (let i = localMaxIdx; i >= leftIdx; i--) {
      if (temps[i] <= halfHeight) {
        widthLeft = times[i]
        break
      }
    }
    for (let i = localMaxIdx; i <= rightIdx; i++) {
      if (temps[i] <= halfHeight) {
        widthRight = times[i]
        break
      }
    }

    return {
      id: uuidv4(),
      time: times[localMaxIdx],
      temperature: temps[localMaxIdx],
      height: temps[localMaxIdx] - temps[leftIdx],
      width: widthRight - widthLeft,
    }
  })

  const overlaps: OverlapRegion[] = []
  const minPeakInterval = 5

  for (let i = 0; i < peaks.length - 1; i++) {
    for (let j = i + 1; j < peaks.length; j++) {
      const interval = Math.abs(peaks[j].time - peaks[i].time)
      if (interval < minPeakInterval) {
        const avgWidth = (peaks[i].width + peaks[j].width) / 2
        const confidence = Math.max(0, 1 - interval / avgWidth)
        overlaps.push({
          id: uuidv4(),
          startTime: Math.min(peaks[i].time, peaks[j].time) - avgWidth / 2,
          endTime: Math.max(peaks[i].time, peaks[j].time) + avgWidth / 2,
          peakCount: 2,
          confidence: Number(confidence.toFixed(2)),
        })
      }
    }
  }

  if (overlaps.length > 0) {
    warnings.push(`检测到 ${overlaps.length} 处重叠峰，建议人工复核`)
  }

  if (peaks.length === 0) {
    warnings.push('未检测到明显谱峰，请检查温度曲线数据')
  }

  return { peaks, overlaps, warnings }
}

export function updatePeaks(existingPeaks: Peak[], updatedPeaks: Peak[]): Peak[] {
  return updatedPeaks
}
