import type {
  Layer, Boundary, Point, CollisionInfo, Anomaly, Unit, OperationRecord
} from '../types'
import { generateId } from '../types'

export function calculateThickness(layer: Layer): number {
  return Math.abs(layer.depth.bottom - layer.depth.top)
}

export function convertToMeters(value: number, fromUnit: Unit): number {
  if (fromUnit === 'foot') return value * 0.3048
  return value
}

export function convertUnit(
  value: number,
  toUnit: Unit,
  fromUnit: Unit = 'meter'
): number {
  if (toUnit === fromUnit) return value
  const inMeters = convertToMeters(value, fromUnit)
  if (toUnit === 'foot') return inMeters / 0.3048
  return inMeters
}

function direction(pi: Point, pj: Point, pk: Point): number {
  return (pk.x - pi.x) * (pj.y - pi.y) - (pj.x - pi.x) * (pk.y - pi.y)
}

function onSegment(pi: Point, pj: Point, pk: Point): boolean {
  return Math.min(pi.x, pj.x) <= pk.x && pk.x <= Math.max(pi.x, pj.x) &&
         Math.min(pi.y, pj.y) <= pk.y && pk.y <= Math.max(pi.y, pj.y)
}

export function segmentsIntersect(
  p1: Point, p2: Point, p3: Point, p4: Point
): boolean {
  const d1 = direction(p3, p4, p1)
  const d2 = direction(p3, p4, p2)
  const d3 = direction(p1, p2, p3)
  const d4 = direction(p1, p2, p4)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }

  if (d1 === 0 && onSegment(p3, p4, p1)) return true
  if (d2 === 0 && onSegment(p3, p4, p2)) return true
  if (d3 === 0 && onSegment(p1, p2, p3)) return true
  if (d4 === 0 && onSegment(p1, p2, p4)) return true

  return false
}

export function distancePointToSegment(point: Point, p1: Point, p2: Point): number {
  const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
  if (l2 === 0) {
    return Math.sqrt(Math.pow(point.x - p1.x, 2) + Math.pow(point.y - p1.y, 2))
  }
  let t = ((point.x - p1.x) * (p2.x - p1.x) + (point.y - p1.y) * (p2.y - p1.y)) / l2
  t = Math.max(0, Math.min(1, t))
  const projection = {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y)
  }
  return Math.sqrt(Math.pow(point.x - projection.x, 2) + Math.pow(point.y - projection.y, 2))
}

export function detectBoundaryCollision(
  boundaries: Boundary[],
  threshold: number = 10
): Array<{ boundaryId: string; info: CollisionInfo }> {
  const results: Array<{ boundaryId: string; info: CollisionInfo }> = []

  for (let i = 0; i < boundaries.length; i++) {
    for (let j = i + 1; j < boundaries.length; j++) {
      const b1 = boundaries[i]
      const b2 = boundaries[j]

      if (segmentsIntersect(b1.startPoint, b1.endPoint, b2.startPoint, b2.endPoint)) {
        const midPoint = {
          x: (b1.startPoint.x + b1.endPoint.x + b2.startPoint.x + b2.endPoint.x) / 4,
          y: (b1.startPoint.y + b1.endPoint.y + b2.startPoint.y + b2.endPoint.y) / 4
        }
        results.push({
          boundaryId: b1.id,
          info: {
            collidedBoundaryId: b2.id,
            collisionPoint: midPoint,
            distance: 0,
            severity: 'high'
          }
        })
        continue
      }

      const dist1 = distancePointToSegment(b1.startPoint, b2.startPoint, b2.endPoint)
      const dist2 = distancePointToSegment(b1.endPoint, b2.startPoint, b2.endPoint)
      const dist3 = distancePointToSegment(b2.startPoint, b1.startPoint, b1.endPoint)
      const dist4 = distancePointToSegment(b2.endPoint, b1.startPoint, b1.endPoint)
      const minDist = Math.min(dist1, dist2, dist3, dist4)

      if (minDist < threshold) {
        results.push({
          boundaryId: b1.id,
          info: {
            collidedBoundaryId: b2.id,
            collisionPoint: {
              x: (b1.startPoint.x + b2.startPoint.x) / 2,
              y: (b1.startPoint.y + b2.startPoint.y) / 2
            },
            distance: minDist,
            severity: minDist < threshold / 2 ? 'medium' : 'low'
          }
        })
      }
    }
  }

  return results
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  anomalyHints: Array<{ type: string; message: string }>
}

export function validateLayerData(layer: Layer): ValidationResult {
  const errors: string[] = []
  const anomalyHints: Array<{ type: string; message: string }> = []

  if (!layer.name || layer.name.trim() === '') {
    errors.push('岩层名称不能为空')
  }

  if (layer.depth.top < 0 || layer.depth.bottom < 0) {
    errors.push('深度不能为负值')
  }

  if (layer.depth.bottom <= layer.depth.top) {
    anomalyHints.push({ type: 'negative_thickness', message: '厚度为负值或零' })
  }

  if (layer.unit === 'unknown' || !layer.unit) {
    anomalyHints.push({ type: 'missing_unit', message: '单位未标注' })
  }

  return { valid: errors.length === 0, errors, anomalyHints }
}

export function detectUnitMismatch(layers: Layer[]): boolean {
  const units = new Set(layers.filter(l => l.unit !== 'unknown').map(l => l.unit))
  return units.size > 1
}

export function detectDuplicateAnnotations(
  layers: Layer[]
): Array<{ layerId: string; position: Point; count: number }> {
  const duplicates: Array<{ layerId: string; position: Point; count: number }> = []

  layers.forEach(layer => {
    const seen = new Map<string, number>()
    layer.annotations.forEach(ann => {
      const key = `${ann.position.x.toFixed(0)}_${ann.position.y.toFixed(0)}`
      seen.set(key, (seen.get(key) || 0) + 1)
    })
    seen.forEach((count, key) => {
      if (count > 1) {
        const [x, y] = key.split('_').map(Number)
        duplicates.push({ layerId: layer.id, position: { x, y }, count })
      }
    })
  })

  return duplicates
}

export function autoDetectAnomalies(
  layers: Layer[],
  boundaries: Boundary[],
  existingOperations: OperationRecord[] = []
): Anomaly[] {
  const anomalies: Anomaly[] = []

  layers.forEach(layer => {
    const thickness = calculateThickness(layer)
    if (thickness <= 0 || layer.depth.bottom <= layer.depth.top) {
      anomalies.push({
        id: generateId('anom'),
        type: 'negative_thickness',
        severity: 'high',
        location: {
          layerId: layer.id,
          coordinates: { x: 100, y: (layer.depth.top + layer.depth.bottom) / 2 * 20 }
        },
        description: `岩层「${layer.name}」厚度为负值或零`,
        explanation: '岩层底部深度小于或等于顶部深度，可能是数据录入错误或原始勘测数据存在问题。',
        suggestion: '请核对原始勘测记录，修正岩层深度数据。',
        relatedOperations: existingOperations,
        status: 'pending',
        createdAt: new Date()
      })
    }

    if (layer.unit === 'unknown' || !layer.unit) {
      anomalies.push({
        id: generateId('anom'),
        type: 'missing_unit',
        severity: 'medium',
        location: {
          layerId: layer.id,
          coordinates: { x: 100, y: layer.depth.top * 20 }
        },
        description: `岩层「${layer.name}」未标注单位`,
        explanation: '该岩层缺少单位标注（米或英尺），可能导致数据计算和报告误解。',
        suggestion: '请为该岩层补充单位标注（米或英尺）。',
        relatedOperations: existingOperations,
        status: 'pending',
        createdAt: new Date()
      })
    }
  })

  if (detectUnitMismatch(layers)) {
    anomalies.push({
      id: generateId('anom'),
      type: 'unit_mismatch',
      severity: 'medium',
      location: { coordinates: { x: 0, y: 0 } },
      description: '不同岩层使用了不同的单位',
      explanation: '部分岩层使用米，部分使用英尺，容易造成数据混淆和计算错误。',
      suggestion: '建议统一所有岩层的单位，或在报告中明确标注单位换算关系。',
      relatedOperations: existingOperations,
      status: 'pending',
      createdAt: new Date()
    })
  }

  const dupAnns = detectDuplicateAnnotations(layers)
  dupAnns.forEach(d => {
    const layer = layers.find(l => l.id === d.layerId)
    anomalies.push({
      id: generateId('anom'),
      type: 'duplicate_annotation',
      severity: 'low',
      location: { layerId: d.layerId, coordinates: d.position },
      description: layer
        ? `岩层「${layer.name}」存在重复标注（${d.count}个）`
        : `存在重复标注（${d.count}个）`,
      explanation: '同一位置存在多个文字标注，可能是误操作导致重复添加。',
      suggestion: '请检查并删除重复的标注，只保留必要的内容。',
      relatedOperations: existingOperations,
      status: 'pending',
      createdAt: new Date()
    })
  })

  const collisions = detectBoundaryCollision(boundaries)
  collisions.forEach(c => {
    const b1 = boundaries.find(b => b.id === c.boundaryId)
    const b2 = boundaries.find(b => b.id === c.info.collidedBoundaryId)
    anomalies.push({
      id: generateId('anom'),
      type: 'boundary_collision',
      severity: c.info.severity,
      location: {
        boundaryId: c.boundaryId,
        coordinates: c.info.collisionPoint
      },
      description: b1 && b2
        ? `边界「${b1.id}」与「${b2.id}」发生碰撞或距离过近`
        : '边界发生碰撞或距离过近',
      explanation: '两条岩层边界线发生交叉或距离小于安全阈值，可能会导致剖面区域重叠或区域识别错误。安全培训中此类错误常被误判为正常情况。',
      suggestion: '请检查两条边界线的位置，调整使它们保持合理距离或正确衔接。',
      relatedOperations: existingOperations,
      status: 'pending',
      createdAt: new Date()
    })
  })

  return anomalies
}
