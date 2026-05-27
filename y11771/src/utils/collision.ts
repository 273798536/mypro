import * as THREE from 'three'
import { type Obstacle, type SafetyZone } from './kinematics'

export interface CollisionResult {
  collides: boolean
  linkIndex: number
  obstacleId?: string
  type: 'obstacle' | 'safety_zone'
}

function segmentSphereIntersects(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  center: THREE.Vector3,
  radius: number
): boolean {
  const d = new THREE.Vector3().subVectors(p2, p1)
  const f = new THREE.Vector3().subVectors(p1, center)
  const a = d.dot(d)
  const b = 2 * f.dot(d)
  const c = f.dot(f) - radius * radius

  if (a === 0) return f.length() < radius

  let discriminant = b * b - 4 * a * c
  if (discriminant < 0) {
    const closest = new THREE.Vector3().copy(p1).add(d.multiplyScalar(0.5))
    return closest.distanceTo(center) < radius
  }

  const sqrtD = Math.sqrt(discriminant)
  const t1 = (-b - sqrtD) / (2 * a)
  const t2 = (-b + sqrtD) / (2 * a)

  if (t1 > 1 || t2 < 0) {
    return p1.distanceTo(center) < radius || p2.distanceTo(center) < radius
  }

  if (t1 < 0 && t2 > 1) return true

  return true
}

function segmentAABBIntersection(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  boxCenter: THREE.Vector3,
  boxHalfSize: [number, number, number]
): boolean {
  const direction = new THREE.Vector3().subVectors(p2, p1)
  const length = direction.length()
  if (length === 0) {
    return (
      Math.abs(p1.x - boxCenter.x) < boxHalfSize[0] &&
      Math.abs(p1.y - boxCenter.y) < boxHalfSize[1] &&
      Math.abs(p1.z - boxCenter.z) < boxHalfSize[2]
    )
  }
  direction.normalize()

  const ray = new THREE.Ray(p1, direction)
  const box = new THREE.Box3(
    new THREE.Vector3(
      boxCenter.x - boxHalfSize[0],
      boxCenter.y - boxHalfSize[1],
      boxCenter.z - boxHalfSize[2]
    ),
    new THREE.Vector3(
      boxCenter.x + boxHalfSize[0],
      boxCenter.y + boxHalfSize[1],
      boxCenter.z + boxHalfSize[2]
    )
  )

  const intersectionPoint = new THREE.Vector3()
  const hit = ray.intersectBox(box, intersectionPoint)
  if (!hit) return false

  const t = intersectionPoint.distanceTo(p1)
  return t <= length
}

export function checkArmObstacleCollisions(
  jointPositions: THREE.Vector3[],
  obstacles: Obstacle[]
): CollisionResult[] {
  const results: CollisionResult[] = []

  for (let i = 1; i < jointPositions.length; i++) {
    const p1 = jointPositions[i - 1]
    const p2 = jointPositions[i]

    for (const obs of obstacles) {
      let collides = false

      if (obs.type === 'sphere') {
        collides = segmentSphereIntersects(p1, p2, new THREE.Vector3(...obs.position), obs.size as number)
      } else if (obs.type === 'box') {
        const halfSize = (obs.size as [number, number, number]).map(s => s / 2) as [number, number, number]
        collides = segmentAABBIntersection(p1, p2, new THREE.Vector3(...obs.position), halfSize)
      }

      if (collides) {
        results.push({
          collides: true,
          linkIndex: i - 1,
          obstacleId: obs.id,
          type: 'obstacle',
        })
      }
    }
  }

  return results
}

export function checkSafetyZoneViolation(
  endEffector: THREE.Vector3,
  safetyZones: SafetyZone[]
): CollisionResult[] {
  const results: CollisionResult[] = []

  for (const zone of safetyZones) {
    const center = new THREE.Vector3(...zone.position)
    let violated = false

    if (zone.type === 'sphere') {
      violated = endEffector.distanceTo(center) > zone.size
    } else if (zone.type === 'cylinder') {
      const [radius, height] = zone.size
      const dx = endEffector.x - center.x
      const dz = endEffector.z - center.z
      const horizontalDist = Math.sqrt(dx * dx + dz * dz)
      const vertDist = Math.abs(endEffector.y - center.y)
      violated = horizontalDist > radius || vertDist > height / 2
    }

    if (violated) {
      results.push({
        collides: true,
        linkIndex: -1,
        obstacleId: zone.id,
        type: 'safety_zone',
      })
    }
  }

  return results
}
