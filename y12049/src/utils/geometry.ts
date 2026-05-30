import { Point, FoldLine } from '../types'

export function calculateAngle(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  return angle
}

export function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

export function calculateArea(points: Point[]): number {
  if (points.length < 3) return 0
  
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  
  return Math.abs(area / 2)
}

export function foldPoint(point: Point, foldLine: FoldLine): Point {
  const { start, end } = foldLine
  
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.sqrt(dx * dx + dy * dy)
  
  if (len === 0) return point
  
  const nx = -dy / len
  const ny = dx / len
  
  const px = point.x - start.x
  const py = point.y - start.y
  
  const dist = px * nx + py * ny
  
  return {
    x: point.x - 2 * dist * nx,
    y: point.y - 2 * dist * ny
  }
}

export function getFoldLineFromPoints(p1: Point, p2: Point): FoldLine {
  return {
    id: `fold-${Date.now()}`,
    start: p1,
    end: p2,
    angle: calculateAngle(p1, p2)
  }
}

export function checkOverlap(line1: FoldLine, line2: FoldLine, tolerance: number = 5): boolean {
  const angleDiff = Math.abs(line1.angle - line2.angle)
  if (angleDiff > tolerance && angleDiff < 180 - tolerance) {
    return false
  }
  
  const p1 = line1.start
  const p2 = line1.end
  const p3 = line2.start
  const p4 = line2.end
  
  const d1 = pointToLineDistance(p3, p1, p2)
  const d2 = pointToLineDistance(p4, p1, p2)
  
  return d1 < 10 && d2 < 10
}

export function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const len = Math.sqrt(dx * dx + dy * dy)
  
  if (len === 0) return calculateDistance(point, lineStart)
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (len * len)
  ))
  
  const projection = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy
  }
  
  return calculateDistance(point, projection)
}

export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return ''
  return points.map((p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
  ).join(' ') + ' Z'
}

export function createInitialPaper(centerX: number = 200, centerY: number = 200, size: number = 150): Point[] {
  return [
    { x: centerX - size, y: centerY - size },
    { x: centerX + size, y: centerY - size },
    { x: centerX + size, y: centerY + size },
    { x: centerX - size, y: centerY + size }
  ]
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const rad = angle * (Math.PI / 180)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  
  const dx = point.x - center.x
  const dy = point.y - center.y
  
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  }
}

export function scalePoint(point: Point, center: Point, scale: number): Point {
  return {
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale
  }
}
