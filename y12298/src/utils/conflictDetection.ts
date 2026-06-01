import type { Valve, DuplicateValveGroup, InspectionRoute, ForbiddenZone, CorridorModel, Vec3 } from '@/types'

export function detectDuplicateValves(valves: Valve[]): DuplicateValveGroup[] {
  const tagMap = new Map<string, Valve[]>()
  valves.forEach((valve) => {
    if (!tagMap.has(valve.tagNumber)) {
      tagMap.set(valve.tagNumber, [])
    }
    tagMap.get(valve.tagNumber)!.push(valve)
  })

  return Array.from(tagMap.entries())
    .filter(([_, group]) => group.length > 1)
    .map(([tagNumber, valveGroup]) => ({
      tagNumber,
      valves: valveGroup,
      detectedAt: new Date().toISOString(),
      resolved: false,
    }))
}

export function detectForbiddenCrossing(
  routes: InspectionRoute[],
  forbiddenZones: ForbiddenZone[]
): { routeId: string; routeName: string; zoneId: string; zoneName: string; crossingPoints: Vec3[] }[] {
  const violations: { routeId: string; routeName: string; zoneId: string; zoneName: string; crossingPoints: Vec3[] }[] = []

  routes.forEach((route) => {
    forbiddenZones.forEach((zone) => {
      const crossingPoints = route.points
        .filter((point) => isPointInPolygon2D(point.position, zone.boundary))
        .map((p) => p.position)

      if (crossingPoints.length > 0) {
        violations.push({
          routeId: route.id,
          routeName: route.name,
          zoneId: zone.id,
          zoneName: zone.name,
          crossingPoints,
        })
      }
    })
  })

  return violations
}

export function detectModelMismatch(
  corridor: CorridorModel,
  valves: Valve[]
): { valveId: string; tagNumber: string; modelRemark: string; actualTag: string }[] {
  const mismatches: { valveId: string; tagNumber: string; modelRemark: string; actualTag: string }[] = []

  corridor.nodes.forEach((node) => {
    if (node.type === 'valve' && node.label) {
      const valve = valves.find((v) => v.nodeId === node.id)
      if (valve && node.label !== valve.tagNumber) {
        mismatches.push({
          valveId: valve.id,
          tagNumber: valve.tagNumber,
          modelRemark: node.label,
          actualTag: valve.tagNumber,
        })
      }
    }
  })

  return mismatches
}

function isPointInPolygon2D(point: Vec3, polygon: Vec3[]): boolean {
  const [px, , pz] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, , zi] = polygon[i]
    const [xj, , zj] = polygon[j]
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}
