import type { CrossSectionData, CrossSectionPoint, SurfaceDefinition } from '@/types'

const SECTION_SAMPLES = 200

function computeSurfaceSlice(
  surface: SurfaceDefinition,
  params: Record<string, number>,
  axis: 'x' | 'y' | 'z',
  position: number
): CrossSectionPoint[] {
  const points: CrossSectionPoint[] = []
  const isZ = axis === 'z'
  const isY = axis === 'y'

  for (let i = 0; i < SECTION_SAMPLES; i++) {
    const t = i / (SECTION_SAMPLES - 1)
    let pt: [number, number, number]

    if (isZ) {
      const u = surface.uRange[0] + t * (surface.uRange[1] - surface.uRange[0])
      const testPt = surface.computeVertex(params, u, 0.5)
      if (Math.abs(testPt[2] - position) < 0.05) {
        pt = testPt
      } else {
        continue
      }
    } else if (isY) {
      for (let j = 0; j < SECTION_SAMPLES; j++) {
        const u = surface.uRange[0] + (i / (SECTION_SAMPLES - 1)) * (surface.uRange[1] - surface.uRange[0])
        const v = surface.vRange[0] + (j / (SECTION_SAMPLES - 1)) * (surface.vRange[1] - surface.vRange[0])
        const candidate = surface.computeVertex(params, u, v)
        if (Math.abs(candidate[1] - position) < 0.15) {
          points.push({ x: candidate[0], y: candidate[1], z: candidate[2] })
        }
      }
      continue
    } else {
      for (let j = 0; j < SECTION_SAMPLES; j++) {
        const u = surface.uRange[0] + (i / (SECTION_SAMPLES - 1)) * (surface.uRange[1] - surface.uRange[0])
        const v = surface.vRange[0] + (j / (SECTION_SAMPLES - 1)) * (surface.vRange[1] - surface.vRange[0])
        const candidate = surface.computeVertex(params, u, v)
        if (Math.abs(candidate[0] - position) < 0.15) {
          points.push({ x: candidate[0], y: candidate[1], z: candidate[2] })
        }
      }
      continue
    }

    points.push({ x: pt[0], y: pt[1], z: pt[2] })
  }

  return points
}

function detectBreaks(points: CrossSectionPoint[]): number[] {
  if (points.length < 3) return []
  const breaks: number[] = []
  for (let i = 1; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x
    const dy = points[i + 1].y - points[i].y
    const dz = points[i + 1].z - points[i].z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const prevDx = points[i].x - points[i - 1].x
    const prevDy = points[i].y - points[i - 1].y
    const prevDz = points[i].z - points[i - 1].z
    const prevDist = Math.sqrt(prevDx * prevDx + prevDy * prevDy + prevDz * prevDz)
    if (prevDist > 0.001 && dist / prevDist > 5) {
      breaks.push(i)
    }
  }
  return breaks
}

function detectMisleading(
  points: CrossSectionPoint[],
  axis: 'x' | 'y' | 'z'
): boolean {
  if (points.length < 10) return false
  const values = points.map(p => {
    if (axis === 'x') return p.y
    if (axis === 'y') return p.x
    return p.z
  })
  let monotoneChanges = 0
  for (let i = 1; i < values.length; i++) {
    if ((values[i] - values[i - 1]) * (values[Math.min(i + 1, values.length - 1)] - values[i]) < 0) {
      monotoneChanges++
    }
  }
  return monotoneChanges > values.length * 0.3
}

export function computeCrossSection(
  surface: SurfaceDefinition,
  params: Record<string, number>,
  axis: 'x' | 'y' | 'z',
  position: number
): CrossSectionData {
  const points = computeSurfaceSlice(surface, params, axis, position)
  const breakIndices = detectBreaks(points)
  const isMisleading = detectMisleading(points, axis)

  let status: CrossSectionData['status'] = 'normal'
  if (breakIndices.length > 0) status = 'broken'
  else if (isMisleading) status = 'misleading'

  return { axis, position, points, status, breakIndices }
}
