export interface PeakData {
  position: number
  intensity: number
  halfWidth: number
}

export interface OverlapRegion {
  start: number
  end: number
  peakIndices: [number, number]
  overlapRatio: number
}

export function detectPeakOverlap(peaks: PeakData[], threshold = 0.3): OverlapRegion[] {
  const results: OverlapRegion[] = []

  const sorted = [...peaks].sort((a, b) => a.position - b.position)

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    const distance = Math.abs(a.position - b.position)
    const combinedWidth = a.halfWidth + b.halfWidth

    if (distance < combinedWidth) {
      const overlapRatio = (combinedWidth - distance) / Math.min(a.halfWidth, b.halfWidth)

      if (overlapRatio >= threshold) {
        const overlapStart = Math.max(a.position - a.halfWidth, b.position - b.halfWidth)
        const overlapEnd = Math.min(a.position + a.halfWidth, b.position + b.halfWidth)

        const originalIndexA = peaks.indexOf(a)
        const originalIndexB = peaks.indexOf(b)

        results.push({
          start: overlapStart,
          end: overlapEnd,
          peakIndices: [originalIndexA, originalIndexB],
          overlapRatio: Math.round(overlapRatio * 1000) / 1000,
        })
      }
    }
  }

  return results
}

export function generateSpectrumData(
  peaks: PeakData[],
  wavelengthRange: [number, number],
  numPoints = 100
): { wavelength: number; intensity: number }[] {
  const [minWL, maxWL] = wavelengthRange
  const step = (maxWL - minWL) / (numPoints - 1)
  const data: { wavelength: number; intensity: number }[] = []

  for (let i = 0; i < numPoints; i++) {
    const wavelength = minWL + step * i
    let totalIntensity = 0

    for (const peak of peaks) {
      const diff = wavelength - peak.position
      const sigma = peak.halfWidth / (2 * Math.sqrt(2 * Math.LN2))
      const gaussian = peak.intensity * Math.exp(-(diff * diff) / (2 * sigma * sigma))
      totalIntensity += gaussian
    }

    data.push({ wavelength, intensity: totalIntensity })
  }

  return data
}
