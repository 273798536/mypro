import type {
  CrossSection,
  AirflowPath,
  Violation,
  PathNode,
  LayoutData,
} from '@/types'

const WARNING_THRESHOLD = 30
const CRITICAL_THRESHOLD = 15

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11)
}

const distancePointToLine = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) param = dot / lenSq

  let xx: number, yy: number

  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = px - xx
  const dy = py - yy
  return Math.sqrt(dx * dx + dy * dy)
}

const getCrossSectionEndpoints = (
  cs: CrossSection
): { x1: number; y1: number; x2: number; y2: number } => {
  const rad = (cs.angle * Math.PI) / 180
  const halfWidth = cs.width / 2
  return {
    x1: cs.positionX - Math.cos(rad) * halfWidth,
    y1: cs.positionY - Math.sin(rad) * halfWidth,
    x2: cs.positionX + Math.cos(rad) * halfWidth,
    y2: cs.positionY + Math.sin(rad) * halfWidth,
  }
}

export const calculateMinDistance = (
  cs: CrossSection,
  path: AirflowPath
): { distance: number; nearestPoint: PathNode | null } => {
  const endpoints = getCrossSectionEndpoints(cs)
  let minDistance = Infinity
  let nearestPoint: PathNode | null = null

  for (const node of path.pathNodes) {
    const dist = distancePointToLine(
      node.x,
      node.y,
      endpoints.x1,
      endpoints.y1,
      endpoints.x2,
      endpoints.y2
    )
    if (dist < minDistance) {
      minDistance = dist
      nearestPoint = node
    }
  }

  return { distance: minDistance, nearestPoint }
}

export const checkBoundaryViolation = (
  path: AirflowPath,
  layout: LayoutData
): boolean => {
  const { minX, maxX, minY, maxY } = layout.safeBoundaries
  return path.pathNodes.some(
    (node) =>
      node.x < minX || node.x > maxX || node.y < minY || node.y > maxY
  )
}

export const detectViolationsForCrossSection = (
  cs: CrossSection,
  paths: AirflowPath[],
  layout: LayoutData
): Violation[] => {
  const violations: Violation[] = []

  for (const path of paths) {
    const { distance, nearestPoint } = calculateMinDistance(cs, path)

    if (distance < CRITICAL_THRESHOLD) {
      violations.push({
        id: generateId(),
        crossSectionId: cs.id,
        type: 'critical_distance',
        reason: `气流路径与剖切面${cs.name}距离过近（${distance.toFixed(1)}px），已低于安全阈值${CRITICAL_THRESHOLD}px，存在严重的气流短路风险。`,
        severity: 3,
        suggestedFix: '建议调整空调出风方向或重新布置剖切面位置，使气流路径与剖切面保持至少30px的安全距离。',
        position: {
          x: nearestPoint?.x ?? cs.positionX,
          y: nearestPoint?.y ?? cs.positionY,
        },
        distance,
      })
    } else if (distance < WARNING_THRESHOLD) {
      violations.push({
        id: generateId(),
        crossSectionId: cs.id,
        type: 'warning_distance',
        reason: `气流路径与剖切面${cs.name}距离偏近（${distance.toFixed(1)}px），接近安全阈值${WARNING_THRESHOLD}px，需要持续关注。`,
        severity: 2,
        suggestedFix: '建议定期监测该区域气流状态，如距离持续减小则需调整。',
        position: {
          x: nearestPoint?.x ?? cs.positionX,
          y: nearestPoint?.y ?? cs.positionY,
        },
        distance,
      })
    }

    if (checkBoundaryViolation(path, layout)) {
      const outOfBoundsNodes = path.pathNodes.filter(
        (node) =>
          node.x < layout.safeBoundaries.minX ||
          node.x > layout.safeBoundaries.maxX ||
          node.y < layout.safeBoundaries.minY ||
          node.y > layout.safeBoundaries.maxY
      )
      if (outOfBoundsNodes.length > 0) {
        const sampleNode = outOfBoundsNodes[0]
        violations.push({
          id: generateId(),
          crossSectionId: cs.id,
          type: 'boundary_exceed',
          reason: `气流路径超出机房安全边界，在坐标(${sampleNode.x.toFixed(0)}, ${sampleNode.y.toFixed(0)})处越界，安全边界范围为X:${layout.safeBoundaries.minX}-${layout.safeBoundaries.maxX}, Y:${layout.safeBoundaries.minY}-${layout.safeBoundaries.maxY}。`,
          severity: 3,
          suggestedFix: '立即检查空调设备运行状态，调整出风角度和风速，确保气流在安全区域内循环。',
          position: { x: sampleNode.x, y: sampleNode.y },
          distance: 0,
        })
      }
    }
  }

  return violations
}

export const updateAllCrossSectionViolations = (
  crossSections: CrossSection[],
  paths: AirflowPath[],
  layout: LayoutData
): CrossSection[] => {
  return crossSections.map((cs) => {
    const violations = detectViolationsForCrossSection(cs, paths, layout)
    const hasCritical = violations.some((v) => v.severity === 3)
    const hasWarning = violations.some((v) => v.severity === 2)

    return {
      ...cs,
      violations,
      isViolated: violations.length > 0,
      violationType: hasCritical
        ? 'critical'
        : hasWarning
        ? 'warning'
        : 'none',
    }
  })
}

export const analyzeScreenshotForViolations = (
  screenshot: { description: string },
  crossSections: CrossSection[]
): string[] => {
  const detected: string[] = []

  crossSections.forEach((cs) => {
    if (cs.isViolated) {
      const severity = cs.violationType === 'critical' ? '严重' : '警告'
      detected.push(`[${severity}] ${cs.name}: ${cs.violations.map((v) => v.type).join(', ')}`)
    }
  })

  if (screenshot.description.includes('越界') || screenshot.description.includes('异常')) {
    detected.push('人工标注：截图描述中提及越界或异常')
  }

  return detected
}
