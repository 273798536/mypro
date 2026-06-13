export interface DataPoint {
  x: number
  y: number
  unit?: string
}

export interface SegmentResult {
  slope: number
  intercept: number
  r2: number
  startX: number
  endX: number
  unit: string | null
  unitMissing: boolean
  dataPoints: DataPoint[]
  boundarySamples: DataPoint[]
}

export interface RegressionResult {
  segments: SegmentResult[]
  breakpoints: number[]
  totalR2: number
  unitWarnings: string[]
  formulaDisplay: string[]
  boundaryImpact: BoundaryImpact[]
  parameterSensitivity: SensitivityEntry[]
}

export interface BoundaryImpact {
  breakpoint: number
  leftSegment: number
  rightSegment: number
  nearbyPoints: DataPoint[]
  influenceOnConclusion: string
}

export interface SensitivityEntry {
  parameter: string
  oldValue: unknown
  newValue: unknown
  affectedSegments: number[]
  description: string
}

export interface RegressionParams {
  breakpoints?: number[]
  unit?: string
  minSegmentSize?: number
  sensitivityCompare?: {
    params: RegressionParams
    label: string
  }
}

const DEFAULT_MIN_SEGMENT_SIZE = 3

function linearRegression(points: DataPoint[]): { slope: number; intercept: number; r2: number } {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0
  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumX2 += p.x * p.x
    sumY2 += p.y * p.y
  }

  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-12) {
    return { slope: 0, intercept: sumY / n, r2: 0 }
  }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  const yMean = sumY / n
  let ssTot = 0, ssRes = 0
  for (const p of points) {
    const yPred = slope * p.x + intercept
    ssRes += (p.y - yPred) ** 2
    ssTot += (p.y - yMean) ** 2
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0

  return { slope, intercept, r2 }
}

function findBreakpoints(points: DataPoint[], numBreaks: number, minSize: number): number[] {
  if (points.length < minSize * 2 || numBreaks <= 0) return []

  const sorted = [...points].sort((a, b) => a.x - b.x)
  const candidates: { position: number; cost: number }[] = []

  for (let i = minSize; i <= sorted.length - minSize; i++) {
    const left = sorted.slice(0, i)
    const right = sorted.slice(i)
    const lr = linearRegression(left)
    const rr = linearRegression(right)

    let leftResidual = 0, rightResidual = 0
    for (const p of left) leftResidual += (p.y - (lr.slope * p.x + lr.intercept)) ** 2
    for (const p of right) rightResidual += (p.y - (rr.slope * p.x + rr.intercept)) ** 2

    candidates.push({ position: i, cost: leftResidual + rightResidual })
  }

  candidates.sort((a, b) => a.cost - b.cost)

  const selected: number[] = []
  for (const c of candidates) {
    const xVal = sorted[c.position].x
    const tooClose = selected.some(s => Math.abs(s - xVal) < minSize)
    if (!tooClose) {
      selected.push(xVal)
      if (selected.length >= numBreaks) break
    }
  }

  return selected.sort((a, b) => a - b)
}

export function computeSegmentedRegression(
  data: DataPoint[],
  params: RegressionParams = {}
): RegressionResult {
  const minSize = params.minSegmentSize || DEFAULT_MIN_SEGMENT_SIZE
  const sorted = [...data].sort((a, b) => a.x - b.x)

  let breakpoints: number[]
  if (params.breakpoints && params.breakpoints.length > 0) {
    breakpoints = [...params.breakpoints].sort((a, b) => a - b)
  } else {
    breakpoints = findBreakpoints(sorted, 1, minSize)
  }

  const unitWarnings: string[] = []
  const segments: SegmentResult[] = []
  const formulaDisplay: string[] = []
  const boundaryImpact: BoundaryImpact[] = []

  const boundaries = [sorted[0]?.x ?? 0, ...breakpoints, sorted[sorted.length - 1]?.x ?? 0]

  for (let i = 0; i < boundaries.length - 1; i++) {
    const startX = boundaries[i]
    const endX = boundaries[i + 1]
    const segmentPoints = sorted.filter(p => {
      if (i === boundaries.length - 2) return p.x >= startX && p.x <= endX
      return p.x >= startX && p.x < endX
    })

    if (segmentPoints.length === 0) continue

    const lr = linearRegression(segmentPoints)

    const units = segmentPoints.map(p => p.unit).filter(Boolean) as string[]
    const uniqueUnits = [...new Set(units)]
    let segmentUnit: string | null = params.unit || (uniqueUnits.length === 1 ? uniqueUnits[0] : null)
    const unitMissing = !segmentUnit && units.length < segmentPoints.length

    if (unitMissing) {
      unitWarnings.push(`分段 ${i + 1} (x∈[${startX.toFixed(2)}, ${endX.toFixed(2)}]) 存在单位缺失的数据点`)
    }
    if (uniqueUnits.length > 1 && !params.unit) {
      unitWarnings.push(`分段 ${i + 1} 存在混合单位: ${uniqueUnits.join(', ')}`)
    }

    const boundaryRange = (endX - startX) * 0.1
    const boundarySamples = segmentPoints.filter(
      p => Math.abs(p.x - startX) <= boundaryRange || Math.abs(p.x - endX) <= boundaryRange
    )

    const slopeSign = lr.slope >= 0 ? '+' : '-'
    const slopeAbs = Math.abs(lr.slope).toFixed(4)
    const interceptStr = Math.abs(lr.intercept).toFixed(4)
    const interceptSign = lr.intercept >= 0 ? '+' : '-'
    const unitStr = segmentUnit ? ` (${segmentUnit})` : ' (单位缺失)'
    formulaDisplay.push(
      `分段${i + 1}: y = ${slopeSign}${slopeAbs}x ${interceptSign} ${interceptStr}${unitStr}, R²=${lr.r2.toFixed(4)}`
    )

    segments.push({
      slope: lr.slope,
      intercept: lr.intercept,
      r2: lr.r2,
      startX,
      endX,
      unit: segmentUnit,
      unitMissing,
      dataPoints: segmentPoints,
      boundarySamples,
    })
  }

  for (let i = 0; i < breakpoints.length; i++) {
    const bp = breakpoints[i]
    const leftIdx = segments.findIndex(s => s.endX === bp || (s.startX <= bp && s.endX > bp))
    const rightIdx = segments.findIndex(s => s.startX === bp || (s.startX <= bp && s.endX > bp && s !== segments[leftIdx]))

    const leftSeg = leftIdx >= 0 ? segments[leftIdx] : segments[i]
    const rightSeg = rightIdx >= 0 ? segments[rightIdx] : segments[i + 1]

    if (!leftSeg || !rightSeg) continue

    const nearby = sorted.filter(p => Math.abs(p.x - bp) <= (leftSeg.endX - leftSeg.startX) * 0.15)

    const slopeDiff = Math.abs(leftSeg.slope - rightSeg.slope)
    let influence: string
    if (slopeDiff < 0.1) {
      influence = '斜率变化小，断点附近数据对结论影响有限'
    } else if (slopeDiff < 1) {
      influence = '斜率中等变化，边界样本可能左右结论方向'
    } else {
      influence = '斜率显著变化，边界样本对分段结论影响重大'
    }

    boundaryImpact.push({
      breakpoint: bp,
      leftSegment: leftIdx >= 0 ? leftIdx : i,
      rightSegment: rightIdx >= 0 ? rightIdx : i + 1,
      nearbyPoints: nearby,
      influenceOnConclusion: influence,
    })
  }

  const totalR2 = segments.length > 0
    ? segments.reduce((sum, s) => sum + s.r2 * s.dataPoints.length, 0) / sorted.length
    : 0

  return {
    segments,
    breakpoints,
    totalR2,
    unitWarnings,
    formulaDisplay,
    boundaryImpact,
    parameterSensitivity: [],
  }
}

export function computeSensitivity(
  data: DataPoint[],
  baseParams: RegressionParams,
  adjustedParams: RegressionParams,
  adjustedLabel: string
): SensitivityEntry[] {
  const baseResult = computeSegmentedRegression(data, baseParams)
  const adjResult = computeSegmentedRegression(data, adjustedParams)
  const entries: SensitivityEntry[] = []

  if (JSON.stringify(baseParams.breakpoints || []) !== JSON.stringify(adjustedParams.breakpoints || [])) {
    const affectedSegs = baseResult.segments.map((_, i) => i)
    entries.push({
      parameter: '断点位置',
      oldValue: baseParams.breakpoints || [],
      newValue: adjustedParams.breakpoints || [],
      affectedSegments: affectedSegs,
      description: `断点从 [${(baseParams.breakpoints || []).map(b => b.toFixed(2)).join(', ')}] 调整为 [${(adjustedParams.breakpoints || []).map(b => b.toFixed(2)).join(', ')}]，影响所有分段回归结果`,
    })
  }

  if (baseParams.unit !== adjustedParams.unit) {
    const affectedSegs = adjResult.segments
      .map((s, i) => (s.unitMissing || s.unit !== baseParams.unit ? i : -1))
      .filter(i => i >= 0)
    entries.push({
      parameter: '单位设定',
      oldValue: baseParams.unit || '未指定',
      newValue: adjustedParams.unit || '未指定',
      affectedSegments: affectedSegs.length > 0 ? affectedSegs : adjResult.segments.map((_, i) => i),
      description: `单位从 "${baseParams.unit || '未指定'}" 变更为 "${adjustedParams.unit || '未指定'}"`,
    })
  }

  if (baseParams.minSegmentSize !== adjustedParams.minSegmentSize) {
    entries.push({
      parameter: '最小分段样本数',
      oldValue: baseParams.minSegmentSize || DEFAULT_MIN_SEGMENT_SIZE,
      newValue: adjustedParams.minSegmentSize || DEFAULT_MIN_SEGMENT_SIZE,
      affectedSegments: baseResult.segments.map((_, i) => i),
      description: `最小分段样本数从 ${baseParams.minSegmentSize || DEFAULT_MIN_SEGMENT_SIZE} 调整为 ${adjustedParams.minSegmentSize || DEFAULT_MIN_SEGMENT_SIZE}`,
    })
  }

  const maxLen = Math.max(baseResult.segments.length, adjResult.segments.length)
  for (let i = 0; i < maxLen; i++) {
    const bs = baseResult.segments[i]
    const as = adjResult.segments[i]
    if (!bs || !as) continue

    if (Math.abs(bs.slope - as.slope) > 0.001) {
      entries.push({
        parameter: `分段${i + 1}斜率`,
        oldValue: bs.slope.toFixed(4),
        newValue: as.slope.toFixed(4),
        affectedSegments: [i],
        description: `分段${i + 1}斜率从 ${bs.slope.toFixed(4)} 变为 ${as.slope.toFixed(4)}，${as.unitMissing ? '单位缺失可能影响' : '公式或参数变化导致'}`,
      })
    }
  }

  return entries
}
