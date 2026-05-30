import { DetectionResult, FoldLine, Point } from '../types'
import { calculateArea, checkOverlap } from './geometry'
import { traceSource } from './tracer'

export function detectAngleError(
  actual: number,
  expected: number,
  tolerance: number = 5
): DetectionResult | null {
  let diff = Math.abs(actual - expected)
  if (diff > 180) diff = 360 - diff
  
  if (diff <= tolerance) return null
  
  const isSevere = diff > tolerance * 2
  
  return {
    type: 'angle_error',
    severity: isSevere ? 'error' : 'warning',
    message: `角度误差 ${diff.toFixed(1)}°，允许范围 ±${tolerance}°`,
    value: diff,
    threshold: tolerance,
    source: traceSource('detector', 'detectAngleError', 18),
    affectedScore: isSevere ? -15 : -5
  }
}

export function detectAreaMiss(
  calculatedArea: number,
  expectedArea: number,
  thresholdPercent: number = 95
): DetectionResult | null {
  if (expectedArea === 0) return null
  
  const coveragePercent = (calculatedArea / expectedArea) * 100
  
  if (coveragePercent >= thresholdPercent) return null
  
  const isSevere = coveragePercent < thresholdPercent - 10
  
  return {
    type: 'area_miss',
    severity: isSevere ? 'error' : 'warning',
    message: `折叠区域覆盖率 ${coveragePercent.toFixed(1)}%，目标 ${thresholdPercent}%`,
    value: coveragePercent,
    threshold: thresholdPercent,
    source: traceSource('detector', 'detectAreaMiss', 40),
    affectedScore: isSevere ? -20 : -10
  }
}

export function detectFoldOverlap(
  newLine: FoldLine,
  existingLines: FoldLine[],
  tolerance: number = 5
): DetectionResult | null {
  for (const existingLine of existingLines) {
    if (checkOverlap(newLine, existingLine, tolerance)) {
      return {
        type: 'overlap',
        severity: 'error',
        message: '折痕与已有折痕过度重叠，可能导致计算错误',
        value: 100,
        threshold: tolerance,
        source: traceSource('detector', 'detectFoldOverlap', 58),
        affectedScore: -18
      }
    }
  }
  return null
}

export function detectAll(
  points: Point[],
  expectedArea: number,
  foldAngle: number,
  expectedAngle: number,
  newFoldLine: FoldLine,
  existingFoldLines: FoldLine[]
): DetectionResult[] {
  const detections: DetectionResult[] = []
  
  const angleError = detectAngleError(foldAngle, expectedAngle, 5)
  if (angleError) detections.push(angleError)
  
  const actualArea = calculateArea(points)
  const areaMiss = detectAreaMiss(actualArea, expectedArea, 95)
  if (areaMiss) detections.push(areaMiss)
  
  const overlap = detectFoldOverlap(newFoldLine, existingFoldLines, 5)
  if (overlap) detections.push(overlap)
  
  return detections
}

export function getDetectionIcon(type: DetectionResult['type']): string {
  const icons: Record<DetectionResult['type'], string> = {
    angle_error: '📐',
    area_miss: '📊',
    overlap: '⚠️'
  }
  return icons[type] || '❓'
}

export function getDetectionColor(severity: DetectionResult['severity']): string {
  return severity === 'error' ? '#ff6b35' : '#f39c12'
}

export function getDetectionBgColor(severity: DetectionResult['severity']): string {
  return severity === 'error' ? 'rgba(255, 107, 53, 0.15)' : 'rgba(243, 156, 18, 0.15)'
}

export function groupDetectionsByType(
  detections: DetectionResult[]
): Record<DetectionResult['type'], DetectionResult[]> {
  const grouped: Partial<Record<DetectionResult['type'], DetectionResult[]>> = {}
  
  for (const d of detections) {
    if (!grouped[d.type]) grouped[d.type] = []
    grouped[d.type]!.push(d)
  }
  
  return grouped as Record<DetectionResult['type'], DetectionResult[]>
}

export function hasErrorMergeIssue(detections: DetectionResult[]): boolean {
  const types = new Set(detections.map(d => d.type))
  return types.has('angle_error') && types.has('area_miss')
}

export function getMergeWarning(detections: DetectionResult[]): string | null {
  if (hasErrorMergeIssue(detections)) {
    return '检测到角度误差与面积漏算同时出现，请确认是否为错误合并'
  }
  return null
}
